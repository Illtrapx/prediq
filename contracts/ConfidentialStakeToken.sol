// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialStakeToken
/// @author Illtrapx
/// @notice ERC7984 confidential fungible token used as stake currency in the PredictionMarket.
///         Balances and transfers are fully encrypted; individual amounts are not publicly observable.
///         The total supply is minted to the deployer at construction and can be distributed from there.
/// @dev Inherits ZamaEthereumConfig to auto-resolve the FHE coprocessor and ACL addresses by chain ID.
///      Inherits ERC7984 for the encrypted-balance token logic (Zama fhEVM, euint64 balances).
///      The plaintext `initialSupply` passed to the constructor is converted to an encrypted handle
///      via `FHE.asEuint64` before being forwarded to `_mint`, since ERC7984._mint takes euint64.
contract ConfidentialStakeToken is ZamaEthereumConfig, ERC7984 {
    /// @notice Deploys the token and mints `initialSupply` tokens to the deployer.
    /// @param initialSupply Number of tokens (6 decimals) to mint to `msg.sender` on construction.
    constructor(uint64 initialSupply) ERC7984("Confidential Stake Token", "CST", "") {
        euint64 encSupply = FHE.asEuint64(initialSupply);
        FHE.allowThis(encSupply);
        FHE.allow(encSupply, msg.sender);
        _mint(msg.sender, encSupply);
    }
}
