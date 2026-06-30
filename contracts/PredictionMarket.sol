// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, euint128, externalEuint64, ebool, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// @title Confidential Prediction Market
/// @author Illtrapx
/// @notice Binary (YES/NO) markets where each user's stake amount and chosen side stay
/// encrypted on-chain until the market resolves. Only the aggregate pools are revealed
/// (at resolution) so payouts can be computed with a plaintext divisor; individual bets
/// remain private. Bets are funded with an ERC7984 confidential token, so the staked amounts
/// move on-chain as encrypted transfers; pools and positions are encrypted ledgers.
/// @dev Both pools and both per-user stakes update on every bet (the non-chosen side adds
/// an encrypted zero) so the side cannot be inferred from which storage slot changed.
/// Stakes are funded with the ConfidentialStakeToken (ERC7984): `bet()` pulls the encrypted
/// amount from the bettor into this contract via `confidentialTransferFrom` (the bettor must
/// first approve this contract as an operator), and `claim()` pays winners back with
/// `confidentialTransfer`. The token amounts moved are themselves encrypted, so confidentiality
/// holds end-to-end.
contract PredictionMarket is ZamaEthereumConfig {
    struct Market {
        string question;
        uint64 resolveDeadline; // unix seconds; bets allowed strictly before this
        address resolver; // only address allowed to call resolve()
        bool resolved; // resolver has set the winning side
        bool winningSide; // plaintext outcome, valid once resolved (true = YES)
        bool finalized; // pools revealed + verified, payouts computable
        bool hasBets; // at least one bet has been placed; resolve() requires this
        uint64 totalPool; // yes + no, valid once finalized
        uint64 winningPool; // pool on the winning side, valid once finalized
    }

    /// @notice Number of markets created; valid market ids are [0, marketCount).
    uint256 public marketCount;

    mapping(uint256 id => Market market) private _markets;

    // Encrypted aggregate pools per market.
    mapping(uint256 id => euint64 pool) private _yesPool;
    mapping(uint256 id => euint64 pool) private _noPool;

    // Encrypted per-user positions per market.
    mapping(uint256 id => mapping(address bettor => euint64 stake)) private _yesStake;
    mapping(uint256 id => mapping(address bettor => euint64 stake)) private _noStake;

    // Tracks whether an address has placed at least one bet on a market.
    mapping(uint256 id => mapping(address bettor => bool placed)) private _hasBet;

    // Replay guard for claims + the computed payout handle per claimer.
    mapping(uint256 id => mapping(address bettor => bool claimed)) private _claimed;
    mapping(uint256 id => mapping(address bettor => euint64 payout)) private _payout;

    /// @notice The confidential ERC7984 token used to fund bets and pay out winners.
    IERC7984 private immutable _TOKEN;

    /// @notice Wires the market to its confidential stake token.
    /// @param token The deployed ConfidentialStakeToken (ERC7984) used as stake currency.
    constructor(IERC7984 token) {
        _TOKEN = token;
    }

    /// @notice Emitted when a market is opened.
    /// @param id The new market id.
    /// @param resolver The address allowed to resolve the market.
    /// @param question The market question.
    /// @param resolveDeadline Unix timestamp separating betting from resolution.
    event MarketCreated(uint256 indexed id, address indexed resolver, string question, uint64 indexed resolveDeadline);

    /// @notice Emitted when a bet is placed.
    /// @param id The market id.
    /// @param bettor The address that placed the bet.
    event BetPlaced(uint256 indexed id, address indexed bettor);

    /// @notice Emitted when the resolver declares the outcome.
    /// @param id The market id.
    /// @param winningSide The winning side (true = YES).
    event MarketResolved(uint256 indexed id, bool indexed winningSide);

    /// @notice Emitted when the revealed pools are verified and stored.
    /// @param id The market id.
    /// @param totalPool The total of both pools.
    /// @param winningPool The pool on the winning side.
    event PoolsFinalized(uint256 indexed id, uint64 indexed totalPool, uint64 indexed winningPool);

    /// @notice Emitted when a bettor claims their payout.
    /// @param id The market id.
    /// @param bettor The claiming address.
    event Claimed(uint256 indexed id, address indexed bettor);

    error MarketDoesNotExist();
    error BettingClosed();
    error NotResolver();
    error TooEarlyToResolve();
    error AlreadyResolved();
    error NotResolved();
    error AlreadyFinalized();
    error NotFinalized();
    error AlreadyClaimed();
    error DeadlineTooEarly();
    error EmptyMarket();
    error PoolValueOverflow();
    error NoBetPlaced();

    /// @notice Reverts if `id` is not an existing market.
    /// @param id The market id to check.
    modifier marketExists(uint256 id) {
        if (!(id < marketCount)) revert MarketDoesNotExist();
        _;
    }

    /// @notice Opens a new binary market. Caller becomes the resolver.
    /// @param question Human-readable market question.
    /// @param resolveDeadline Unix timestamp; must be strictly in the future. Bets accepted
    /// strictly before it, resolution after it.
    /// @return id The new market id.
    function createMarket(string calldata question, uint64 resolveDeadline) external returns (uint256 id) {
        if (!(block.timestamp < resolveDeadline)) revert DeadlineTooEarly();
        id = marketCount;
        ++marketCount;
        Market storage m = _markets[id];
        m.question = question;
        m.resolveDeadline = resolveDeadline;
        m.resolver = msg.sender;
        emit MarketCreated(id, msg.sender, question, resolveDeadline);
    }

    /// @notice Places an encrypted bet. Both the amount and the side are ciphertext inputs.
    /// @dev Both pools and both user stakes are updated every call; the unchosen side adds an
    /// encrypted zero so the chosen side is not observable from storage writes.
    /// User decrypt rights on stakes are intentionally deferred to claim() to prevent
    /// mid-market side inference from which stake handle a user can decrypt.
    /// @dev The bettor must approve this contract as an ERC7984 operator on the stake token
    /// (`setOperator(market, until)`) before betting; the encrypted amount is pulled in via
    /// `confidentialTransferFrom`. The *actually transferred* amount (clamped to the bettor's
    /// balance by the token) is what gets staked, so an over-bet credits only the funded amount.
    /// @param id Market id.
    /// @param amount Encrypted stake amount (externalEuint64) from the client.
    /// @param side Encrypted side (externalEbool); true = YES.
    /// @param inputProof Shared input proof covering both `amount` and `side` (one encrypt() bundle).
    function bet(
        uint256 id,
        externalEuint64 amount,
        externalEbool side,
        bytes calldata inputProof
    ) external marketExists(id) {
        Market storage m = _markets[id];
        if (m.resolved || !(block.timestamp < m.resolveDeadline)) revert BettingClosed();
        m.hasBets = true;
        _hasBet[id][msg.sender] = true;

        euint64 toYes;
        euint64 toNo;
        {
            euint64 amt = FHE.fromExternal(amount, inputProof);
            ebool isYes = FHE.fromExternal(side, inputProof);
            // Pull the encrypted stake from the bettor into this contract. `funded` is the amount
            // the token actually moved (0 if the bettor's balance was insufficient).
            FHE.allowTransient(amt, address(_TOKEN));
            euint64 funded = _TOKEN.confidentialTransferFrom(msg.sender, address(this), amt);
            euint64 zero = FHE.asEuint64(0);
            toYes = FHE.select(isYes, funded, zero);
            toNo = FHE.select(isYes, zero, funded);
        }

        _yesPool[id] = FHE.add(_yesPool[id], toYes);
        _noPool[id] = FHE.add(_noPool[id], toNo);
        _yesStake[id][msg.sender] = FHE.add(_yesStake[id][msg.sender], toYes);
        _noStake[id][msg.sender] = FHE.add(_noStake[id][msg.sender], toNo);

        // Contract must be able to reuse the pools next tx and reveal them at resolution.
        FHE.allowThis(_yesPool[id]);
        FHE.allowThis(_noPool[id]);
        // Contract must reuse stakes in claim(); user decrypt rights granted at claim time only.
        FHE.allowThis(_yesStake[id][msg.sender]);
        FHE.allowThis(_noStake[id][msg.sender]);

        emit BetPlaced(id, msg.sender);
    }

    /// @notice Resolver declares the plaintext winning side and exposes the pools for public
    /// decryption. The pool ciphertexts are flagged decryptable here; the cleartexts are
    /// submitted back through finalizePools().
    /// @param id Market id.
    /// @param winningSide true = YES won, false = NO won.
    function resolve(uint256 id, bool winningSide) external marketExists(id) {
        Market storage m = _markets[id];
        if (msg.sender != m.resolver) revert NotResolver();
        if (block.timestamp < m.resolveDeadline) revert TooEarlyToResolve();
        if (m.resolved) revert AlreadyResolved();
        if (!m.hasBets) revert EmptyMarket();

        m.resolved = true;
        m.winningSide = winningSide;

        FHE.makePubliclyDecryptable(_yesPool[id]);
        FHE.makePubliclyDecryptable(_noPool[id]);

        emit MarketResolved(id, winningSide);
    }

    /// @notice Submits the publicly decrypted pool totals plus the KMS decryption proof. The
    /// proof is verified against the pool handles (order: [yesPool, noPool]); on success the
    /// plaintext total/winning pools are stored, enabling claims.
    /// @dev `abiEncodedCleartexts` and `decryptionProof` come verbatim from the relayer SDK
    /// `publicDecrypt([yesPool, noPool])` call. Decoding mirrors the [yes, no] handle order.
    /// @param id Market id.
    /// @param abiEncodedCleartexts ABI-encoded cleartexts as returned by the SDK.
    /// @param decryptionProof KMS signatures returned by the SDK.
    function finalizePools(
        uint256 id,
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    ) external marketExists(id) {
        Market storage m = _markets[id];
        if (!m.resolved) revert NotResolved();
        if (m.finalized) revert AlreadyFinalized();

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(_yesPool[id]);
        handles[1] = FHE.toBytes32(_noPool[id]);

        // Reverts if the proof does not match the handles + cleartexts.
        FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);

        (uint256 clearYes, uint256 clearNo) = abi.decode(abiEncodedCleartexts, (uint256, uint256));
        if (clearYes > type(uint64).max || clearNo > type(uint64).max) revert PoolValueOverflow();
        if (uint256(uint64(clearYes)) + uint256(uint64(clearNo)) > type(uint64).max) revert PoolValueOverflow();
        uint64 yes = uint64(clearYes);
        uint64 no = uint64(clearNo);

        m.finalized = true;
        m.totalPool = yes + no;
        m.winningPool = m.winningSide ? yes : no;

        emit PoolsFinalized(id, m.totalPool, m.winningPool);
    }

    /// @notice Computes the caller's encrypted payout for a finalized market and grants the
    /// caller decryption rights over it. Payout = stake_on_winning_side * totalPool / winningPool.
    /// @dev Uses plaintext-divisor FHE.div (winningPool is revealed), which is why pools must be
    /// finalized first. If winningPool is 0 (no winners) payouts are 0. Idempotency is enforced
    /// per caller; the handle is also readable later via getPayout().
    /// @param id Market id.
    /// @return payout The encrypted payout handle, decryptable by the caller.
    function claim(uint256 id) external marketExists(id) returns (euint64 payout) {
        Market storage m = _markets[id];
        if (!m.finalized) revert NotFinalized();
        if (!_hasBet[id][msg.sender]) revert NoBetPlaced();
        if (_claimed[id][msg.sender]) revert AlreadyClaimed();
        _claimed[id][msg.sender] = true;

        euint64 stake = m.winningSide ? _yesStake[id][msg.sender] : _noStake[id][msg.sender];

        if (m.winningPool == 0) {
            payout = FHE.asEuint64(0);
        } else {
            // Promote to euint128 for the intermediate multiply to prevent euint64 overflow.
            // Result is at most totalPool (≤ uint64 max) so the final cast is safe.
            euint128 stakeWide = FHE.asEuint128(stake);
            payout = FHE.asEuint64(FHE.div(FHE.mul(stakeWide, uint128(m.totalPool)), uint128(m.winningPool)));
        }

        _payout[id][msg.sender] = payout;
        FHE.allowThis(payout);
        FHE.allow(payout, msg.sender);
        // Grant user decrypt rights on their winning stake now that the market is resolved;
        // deferring from bet() prevents mid-market side inference.
        FHE.allow(stake, msg.sender);

        // Pay the winner in confidential tokens (encrypted transfer out of the market's balance,
        // which was funded by every bet placed on this market).
        FHE.allowTransient(payout, address(_TOKEN));
        _TOKEN.confidentialTransfer(msg.sender, payout);

        emit Claimed(id, msg.sender);
    }

    // ---------------------------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------------------------

    /// @notice The confidential stake token this market funds bets and payouts with.
    /// @return token The ERC7984 token address.
    function stakeToken() external view returns (address token) {
        return address(_TOKEN);
    }

    /// @notice Returns the plaintext market metadata.
    /// @param id Market id.
    /// @return market The market struct.
    function getMarket(uint256 id) external view marketExists(id) returns (Market memory market) {
        return _markets[id];
    }

    /// @notice Returns the encrypted pool handles (decryptable only after resolution).
    /// @param id Market id.
    /// @return yesPool The encrypted YES pool handle.
    /// @return noPool The encrypted NO pool handle.
    function getPools(uint256 id) external view marketExists(id) returns (euint64 yesPool, euint64 noPool) {
        return (_yesPool[id], _noPool[id]);
    }

    /// @notice Returns the caller's encrypted stake handles for a market.
    /// @param id Market id.
    /// @return yesStake The caller's encrypted YES stake handle.
    /// @return noStake The caller's encrypted NO stake handle.
    function getStakes(uint256 id) external view marketExists(id) returns (euint64 yesStake, euint64 noStake) {
        return (_yesStake[id][msg.sender], _noStake[id][msg.sender]);
    }

    /// @notice Whether `bettor` has already claimed market `id`.
    /// @param id Market id.
    /// @param bettor The address to check.
    /// @return claimed True if already claimed.
    function hasClaimed(uint256 id, address bettor) external view marketExists(id) returns (bool claimed) {
        return _claimed[id][bettor];
    }

    /// @notice Returns the caller's encrypted payout handle for a claimed market.
    /// @param id Market id.
    /// @return payout The caller's encrypted payout handle.
    function getPayout(uint256 id) external view marketExists(id) returns (euint64 payout) {
        return _payout[id][msg.sender];
    }
}
