import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import {
  PredictionMarket,
  PredictionMarket__factory,
  ConfidentialStakeToken,
  ConfidentialStakeToken__factory,
} from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

// Each bettor starts with this much CST and approves the market as operator.
const STARTING_CST = 10_000;
// Operator approval expiry (uint48 unix seconds) — far enough out for any test.
const OPERATOR_UNTIL = 2_000_000_000;

async function deployFixture(signers: Signers) {
  // Stake token first; the market takes its address as a constructor arg.
  const tokenFactory = (await ethers.getContractFactory("ConfidentialStakeToken")) as ConfidentialStakeToken__factory;
  const token = (await tokenFactory.connect(signers.deployer).deploy(1_000_000n)) as ConfidentialStakeToken;
  const tokenAddress = await token.getAddress();

  const factory = (await ethers.getContractFactory("PredictionMarket")) as PredictionMarket__factory;
  const contract = (await factory.connect(signers.deployer).deploy(tokenAddress)) as PredictionMarket;
  const address = await contract.getAddress();

  // Fund alice & bob with CST from the deployer, then have each approve the market as operator.
  for (const bettor of [signers.alice, signers.bob]) {
    const enc = await fhevm
      .createEncryptedInput(tokenAddress, signers.deployer.address)
      .add64(STARTING_CST)
      .encrypt();
    await (
      await token
        .connect(signers.deployer)
        ["confidentialTransfer(address,bytes32,bytes)"](bettor.address, enc.handles[0], enc.inputProof)
    ).wait();
    await (await token.connect(bettor).setOperator(address, OPERATOR_UNTIL)).wait();
  }

  return { contract, address, token, tokenAddress };
}

// Decrypt an account's confidential CST balance.
async function cstBalanceOf(
  token: ConfidentialStakeToken,
  tokenAddress: string,
  account: HardhatEthersSigner,
): Promise<bigint> {
  const handle = await token.confidentialBalanceOf(account.address);
  return fhevm.userDecryptEuint(FhevmType.euint64, handle, tokenAddress, account);
}

// Encrypt (amount, side) bound to (contract, bettor) and place a bet.
async function placeBet(
  contract: PredictionMarket,
  address: string,
  bettor: HardhatEthersSigner,
  id: number,
  amount: number,
  side: boolean,
) {
  const enc = await fhevm.createEncryptedInput(address, bettor.address).add64(amount).addBool(side).encrypt();
  const tx = await contract.connect(bettor).bet(id, enc.handles[0], enc.handles[1], enc.inputProof);
  await tx.wait();
}

async function increaseTimeTo(ts: number) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [ts]);
  await ethers.provider.send("evm_mine", []);
}

describe("PredictionMarket", function () {
  let signers: Signers;
  let contract: PredictionMarket;
  let address: string;
  let token: ConfidentialStakeToken;
  let tokenAddress: string;

  before(async function () {
    const eth = await ethers.getSigners();
    signers = { deployer: eth[0], alice: eth[1], bob: eth[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite can only run against the FHEVM mock`);
      this.skip();
    }
    ({ contract, address, token, tokenAddress } = await deployFixture(signers));
  });

  async function createMarket(secondsFromNow = 3600): Promise<{ id: number; deadline: number }> {
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const deadline = now + secondsFromNow;
    const tx = await contract.connect(signers.deployer).createMarket("Will it rain?", deadline);
    await tx.wait();
    const id = Number((await contract.marketCount()) - 1n);
    return { id, deadline };
  }

  it("creates a market with the caller as resolver", async function () {
    const { id, deadline } = await createMarket();
    const m = await contract.getMarket(id);
    expect(m.question).to.eq("Will it rain?");
    expect(m.resolver).to.eq(signers.deployer.address);
    expect(m.resolveDeadline).to.eq(deadline);
    expect(m.resolved).to.eq(false);
    expect(m.finalized).to.eq(false);
  });

  it("pools and stakes are uninitialized before any bet", async function () {
    const { id } = await createMarket();
    const [yesPool, noPool] = await contract.getPools(id);
    expect(yesPool).to.eq(ethers.ZeroHash);
    expect(noPool).to.eq(ethers.ZeroHash);
  });

  it("runs the full lifecycle: bet -> resolve -> finalize -> claim", async function () {
    const { id, deadline } = await createMarket();

    // Alice bets 100 on YES, Bob bets 300 on NO. YES wins.
    await placeBet(contract, address, signers.alice, id, 100, true);
    await placeBet(contract, address, signers.bob, id, 300, false);

    // Side stays hidden mid-market: user decrypt rights on stakes are only granted at claim time.

    // Move past the deadline and resolve YES.
    await increaseTimeTo(deadline + 1);
    await (await contract.connect(signers.deployer).resolve(id, true)).wait();

    // Off-chain public decryption of the now-revealable pools.
    const [yesPool, noPool] = await contract.getPools(id);
    const dec = await fhevm.publicDecrypt([yesPool, noPool]);
    expect(dec.clearValues[yesPool]).to.eq(100n);
    expect(dec.clearValues[noPool]).to.eq(300n);

    // Submit cleartexts + proof back on-chain.
    await (
      await contract.connect(signers.alice).finalizePools(id, dec.abiEncodedClearValues, dec.decryptionProof)
    ).wait();

    const m = await contract.getMarket(id);
    expect(m.finalized).to.eq(true);
    expect(m.totalPool).to.eq(400n);
    expect(m.winningPool).to.eq(100n); // YES pool

    // Alice (sole YES bettor) claims the whole pot: 100 * 400 / 100 = 400.
    await (await contract.connect(signers.alice).claim(id)).wait();
    const payoutHandle = await contract.connect(signers.alice).getPayout(id);
    const payout = await fhevm.userDecryptEuint(FhevmType.euint64, payoutHandle, address, signers.alice);
    expect(payout).to.eq(400n);
  });

  it("reverts a bet placed after the deadline", async function () {
    const { id, deadline } = await createMarket();
    await increaseTimeTo(deadline + 1);
    const enc = await fhevm.createEncryptedInput(address, signers.alice.address).add64(50).addBool(true).encrypt();
    await expect(
      contract.connect(signers.alice).bet(id, enc.handles[0], enc.handles[1], enc.inputProof),
    ).to.be.revertedWithCustomError(contract, "BettingClosed");
  });

  it("only the resolver can resolve, and not before the deadline", async function () {
    const { id, deadline } = await createMarket();
    await placeBet(contract, address, signers.alice, id, 10, true);

    // Too early.
    await expect(contract.connect(signers.deployer).resolve(id, true)).to.be.revertedWithCustomError(
      contract,
      "TooEarlyToResolve",
    );

    await increaseTimeTo(deadline + 1);
    // Wrong caller.
    await expect(contract.connect(signers.bob).resolve(id, true)).to.be.revertedWithCustomError(
      contract,
      "NotResolver",
    );
  });

  it("reverts createMarket with a past or zero deadline", async function () {
    await expect(
      contract.connect(signers.deployer).createMarket("Bad market", 0),
    ).to.be.revertedWithCustomError(contract, "DeadlineTooEarly");
  });

  it("reverts resolve on a market with no bets", async function () {
    const { id, deadline } = await createMarket();
    await increaseTimeTo(deadline + 1);
    await expect(contract.connect(signers.deployer).resolve(id, true)).to.be.revertedWithCustomError(
      contract,
      "EmptyMarket",
    );
  });

  it("prevents double finalize and double claim", async function () {
    const { id, deadline } = await createMarket();
    await placeBet(contract, address, signers.alice, id, 100, true);
    await placeBet(contract, address, signers.bob, id, 100, true);

    await increaseTimeTo(deadline + 1);
    await (await contract.connect(signers.deployer).resolve(id, true)).wait();

    const [yesPool, noPool] = await contract.getPools(id);
    const dec = await fhevm.publicDecrypt([yesPool, noPool]);
    await (
      await contract.connect(signers.alice).finalizePools(id, dec.abiEncodedClearValues, dec.decryptionProof)
    ).wait();

    await expect(
      contract.connect(signers.alice).finalizePools(id, dec.abiEncodedClearValues, dec.decryptionProof),
    ).to.be.revertedWithCustomError(contract, "AlreadyFinalized");

    await (await contract.connect(signers.alice).claim(id)).wait();
    await expect(contract.connect(signers.alice).claim(id)).to.be.revertedWithCustomError(contract, "AlreadyClaimed");

    // Two equal YES bettors split the 200 pot evenly: 100 * 200 / 200 = 100 each.
    const payoutHandle = await contract.connect(signers.alice).getPayout(id);
    const payout = await fhevm.userDecryptEuint(FhevmType.euint64, payoutHandle, address, signers.alice);
    expect(payout).to.eq(100n);
  });

  it("bet pulls CST from the bettor into the market", async function () {
    const { id, deadline } = await createMarket();

    // Sanity: alice starts fully funded.
    expect(await cstBalanceOf(token, tokenAddress, signers.alice)).to.eq(BigInt(STARTING_CST));

    await placeBet(contract, address, signers.alice, id, 100, true);

    // Alice's CST dropped by the staked amount — proving the confidential transfer into the market.
    expect(await cstBalanceOf(token, tokenAddress, signers.alice)).to.eq(BigInt(STARTING_CST - 100));

    // The market holds the stake: it's the only YES bettor, so after resolution the YES pool is 100.
    await increaseTimeTo(deadline + 1);
    await (await contract.connect(signers.deployer).resolve(id, true)).wait();
    const [yesPool] = await contract.getPools(id);
    const poolDec = await fhevm.publicDecrypt([yesPool]);
    expect(poolDec.clearValues[yesPool]).to.eq(100n);
  });

  it("claim pays out CST to the winner via encrypted transfer", async function () {
    const { id, deadline } = await createMarket();

    // Alice bets 100 on YES, Bob bets 300 on NO. YES wins → Alice takes the 400 pot.
    await placeBet(contract, address, signers.alice, id, 100, true);
    await placeBet(contract, address, signers.bob, id, 300, false);

    await increaseTimeTo(deadline + 1);
    await (await contract.connect(signers.deployer).resolve(id, true)).wait();

    const [yesPool, noPool] = await contract.getPools(id);
    const dec = await fhevm.publicDecrypt([yesPool, noPool]);
    await (
      await contract.connect(signers.alice).finalizePools(id, dec.abiEncodedClearValues, dec.decryptionProof)
    ).wait();

    await (await contract.connect(signers.alice).claim(id)).wait();

    // Alice spent 100 to bet and received the full 400 pot back as CST.
    expect(await cstBalanceOf(token, tokenAddress, signers.alice)).to.eq(BigInt(STARTING_CST - 100 + 400));
    // Bob (loser) is untouched beyond his 300 stake.
    expect(await cstBalanceOf(token, tokenAddress, signers.bob)).to.eq(BigInt(STARTING_CST - 300));
  });
});
