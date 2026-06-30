import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

/**
 * PredictionMarket — Deploy and interact (mirrors the FHECounter task tutorial)
 * =============================================================================
 *
 * Local:
 *   npx hardhat node
 *   npx hardhat --network localhost deploy
 *   npx hardhat --network localhost task:pm-create --question "Will it rain?" --deadline <unix>
 *   npx hardhat --network localhost task:pm-set-operator   # approve market to pull CST (pm-bet does this automatically)
 *   npx hardhat --network localhost task:pm-bet --id 0 --amount 100 --side yes
 *   npx hardhat --network localhost task:pm-resolve --id 0 --side yes
 *   npx hardhat --network localhost task:pm-finalize --id 0
 *   npx hardhat --network localhost task:pm-claim --id 0
 *
 * Replace --network localhost with --network sepolia to target the real FHEVM.
 */

// Operator approval expiry (uint48 unix seconds) — far future so one approval lasts.
const OPERATOR_UNTIL = 2_000_000_000;

async function getContract(hre: HardhatRuntimeEnvironment, address?: string) {
  const { ethers, deployments } = hre;
  const dep = address ? { address } : await deployments.get("PredictionMarket");
  return ethers.getContractAt("PredictionMarket", dep.address);
}

// Resolve the market's stake token (ConfidentialStakeToken) from the market itself.
async function getToken(hre: HardhatRuntimeEnvironment, marketAddress: string) {
  const { ethers } = hre;
  const market = await ethers.getContractAt("PredictionMarket", marketAddress);
  const tokenAddress = await market.stakeToken();
  return ethers.getContractAt("ConfidentialStakeToken", tokenAddress);
}

task("task:pm-address", "Prints the PredictionMarket address").setAction(async function (_args, hre) {
  const dep = await hre.deployments.get("PredictionMarket");
  console.log("PredictionMarket address is " + dep.address);
});

task("task:pm-create", "Creates a new market")
  .addParam("question", "The market question")
  .addParam("deadline", "Resolve deadline as a unix timestamp (seconds)")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers } = hre;
    const contract = await getContract(hre, args.address);
    const signers = await ethers.getSigners();

    const tx = await contract.connect(signers[0]).createMarket(args.question, BigInt(args.deadline));
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();

    const id = (await contract.marketCount()) - 1n;
    console.log(`Created market id=${id}: "${args.question}" deadline=${args.deadline}`);
  });

task("task:pm-set-operator", "Approves the market as an ERC7984 operator on the stake token")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers } = hre;
    const contract = await getContract(hre, args.address);
    const contractAddress = await contract.getAddress();
    const signers = await ethers.getSigners();

    const token = await getToken(hre, contractAddress);
    const tx = await token.connect(signers[0]).setOperator(contractAddress, OPERATOR_UNTIL);
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();
    console.log(`Market ${contractAddress} approved as CST operator for ${signers[0].address}`);
  });

task("task:pm-bet", "Places an encrypted bet")
  .addParam("id", "Market id")
  .addParam("amount", "Stake amount (integer)")
  .addParam("side", "yes | no")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const contract = await getContract(hre, args.address);
    const contractAddress = await contract.getAddress();
    const signers = await ethers.getSigners();

    const amount = parseInt(args.amount);
    if (!Number.isInteger(amount)) throw new Error(`--amount must be an integer`);
    const side = String(args.side).toLowerCase() === "yes";

    // The market pulls the stake via ERC7984 confidentialTransferFrom, which requires the
    // bettor to have approved the market as an operator. Approve once if not already set.
    const token = await getToken(hre, contractAddress);
    if (!(await token.isOperator(signers[0].address, contractAddress))) {
      console.log(`Approving market as CST operator...`);
      await (await token.connect(signers[0]).setOperator(contractAddress, OPERATOR_UNTIL)).wait();
    }

    const enc = await fhevm
      .createEncryptedInput(contractAddress, signers[0].address)
      .add64(amount)
      .addBool(side)
      .encrypt();

    const tx = await contract.connect(signers[0]).bet(BigInt(args.id), enc.handles[0], enc.handles[1], enc.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();
    console.log(`Bet ${amount} on ${side ? "YES" : "NO"} placed for market ${args.id}`);
  });

task("task:pm-resolve", "Resolves a market (resolver only, after deadline)")
  .addParam("id", "Market id")
  .addParam("side", "Winning side: yes | no")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers } = hre;
    const contract = await getContract(hre, args.address);
    const signers = await ethers.getSigners();
    const side = String(args.side).toLowerCase() === "yes";

    const tx = await contract.connect(signers[0]).resolve(BigInt(args.id), side);
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();
    console.log(`Market ${args.id} resolved: ${side ? "YES" : "NO"} won`);
  });

task("task:pm-finalize", "Publicly decrypts the pools and submits them on-chain")
  .addParam("id", "Market id")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const contract = await getContract(hre, args.address);
    const signers = await ethers.getSigners();

    const [yesPool, noPool] = await contract.getPools(BigInt(args.id));
    const dec = await fhevm.publicDecrypt([yesPool, noPool]);
    console.log(
      `Decrypted pools: yes=${dec.clearValues[yesPool as `0x${string}`]} no=${dec.clearValues[noPool as `0x${string}`]}`,
    );

    const tx = await contract
      .connect(signers[0])
      .finalizePools(BigInt(args.id), dec.abiEncodedClearValues, dec.decryptionProof);
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();

    const m = await contract.getMarket(BigInt(args.id));
    console.log(`Finalized: totalPool=${m.totalPool} winningPool=${m.winningPool}`);
  });

task("task:pm-claim", "Claims and decrypts the caller's payout")
  .addParam("id", "Market id")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const contract = await getContract(hre, args.address);
    const contractAddress = await contract.getAddress();
    const signers = await ethers.getSigners();

    const tx = await contract.connect(signers[0]).claim(BigInt(args.id));
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();

    const handle = await contract.connect(signers[0]).getPayout(BigInt(args.id));
    if (handle === ethers.ZeroHash) {
      console.log("Payout: 0");
      return;
    }
    const payout = await fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddress, signers[0]);
    console.log(`Payout for ${signers[0].address}: ${payout}`);
  });
