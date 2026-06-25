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

// Operator approval expiry (uint48 unix seconds) — far enough out for this run.
const OPERATOR_UNTIL = 2_000_000_000;

// Real-network end-to-end run of the full prediction-market lifecycle on
// Sepolia. Deploys a throwaway ConfidentialStakeToken + PredictionMarket
// (identical bytecode to the deployed demo) so it does not pollute the
// production contracts the frontend reads. Single funded signer plays
// creator/resolver + sole bettor; it holds the whole CST supply (minted at
// token construction) and approves the market as its operator before betting.
describe("PredictionMarketSepolia", function () {
  let deployer: HardhatEthersSigner;
  let contract: PredictionMarket;
  let token: ConfidentialStakeToken;
  let address: string;
  let step = 0;
  const steps = 11;
  const progress = (m: string) => console.log(`${++step}/${steps} ${m}`);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This suite only runs on Sepolia (npx hardhat test <file> --network sepolia)");
      this.skip();
    }
    deployer = (await ethers.getSigners())[0];
  });

  it("create -> bet -> resolve -> finalize -> claim on real FHEVM", async function () {
    this.timeout(10 * 60_000);

    progress(`Deploying throwaway ConfidentialStakeToken (deployer=${deployer.address})...`);
    const tokenFactory = (await ethers.getContractFactory("ConfidentialStakeToken")) as ConfidentialStakeToken__factory;
    token = (await tokenFactory.connect(deployer).deploy(1_000_000n)) as ConfidentialStakeToken;
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    progress(`CST deployed at ${tokenAddress}`);

    progress(`Deploying throwaway PredictionMarket...`);
    const factory = (await ethers.getContractFactory("PredictionMarket")) as PredictionMarket__factory;
    contract = (await factory.connect(deployer).deploy(tokenAddress)) as PredictionMarket;
    await contract.waitForDeployment();
    address = await contract.getAddress();
    progress(`Deployed at ${address}`);

    // Deployer holds the whole CST supply; approve the market to pull stakes.
    await (await token.connect(deployer).setOperator(address, OPERATOR_UNTIL)).wait();

    // Short real deadline; we wall-clock wait for the chain to pass it.
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const deadline = now + 75;
    progress(`createMarket(deadline=+75s)...`);
    await (await contract.connect(deployer).createMarket("E2E: does the full loop work?", deadline)).wait();
    const id = Number((await contract.marketCount()) - 1n);

    progress(`Encrypting bet (100, YES) and calling bet(${id})...`);
    const enc = await fhevm.createEncryptedInput(address, deployer.address).add64(100).addBool(true).encrypt();
    await (await contract.connect(deployer).bet(id, enc.handles[0], enc.handles[1], enc.inputProof)).wait();

    progress(`Waiting for chain time to pass the deadline...`);
    for (;;) {
      const blk = (await ethers.provider.getBlock("latest"))!;
      if (blk.timestamp > deadline) break;
      await sleep(5_000);
    }

    progress(`resolve(${id}, YES)...`);
    await (await contract.connect(deployer).resolve(id, true)).wait();

    progress(`publicDecrypt pools...`);
    const [yesPool, noPool] = await contract.getPools(id);
    const dec = await fhevm.publicDecrypt([yesPool, noPool]);
    expect(dec.clearValues[yesPool]).to.eq(100n);
    expect(dec.clearValues[noPool]).to.eq(0n);

    progress(`finalizePools(${id})...`);
    await (await contract.connect(deployer).finalizePools(id, dec.abiEncodedClearValues, dec.decryptionProof)).wait();
    const m = await contract.getMarket(id);
    expect(m.finalized).to.eq(true);
    expect(m.totalPool).to.eq(100n);
    expect(m.winningPool).to.eq(100n);

    progress(`claim(${id}) and decrypt payout...`);
    await (await contract.connect(deployer).claim(id)).wait();
    const payoutHandle = await contract.connect(deployer).getPayout(id);
    const payout = await fhevm.userDecryptEuint(FhevmType.euint64, payoutHandle, address, deployer);
    progress(`payout = ${payout} (expected 100)`);
    expect(payout).to.eq(100n);
  });
});
