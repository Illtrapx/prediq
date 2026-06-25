import { ethers, fhevm, deployments } from "hardhat";

// Seed the live Sepolia PredictionMarket with demo markets + encrypted bets.
// All bets come from signers[0] (the only funded deployer) — they are encrypted,
// so a single bettor placing both YES and NO is fine for a non-empty demo.

const DAY = 86_400;

async function placeBet(pm: any, addr: string, signer: any, id: bigint, amount: number, side: boolean) {
  const enc = await fhevm
    .createEncryptedInput(addr, signer.address)
    .add64(amount)
    .addBool(side)
    .encrypt();
  const tx = await pm.connect(signer).bet(id, enc.handles[0], enc.handles[1], enc.inputProof);
  console.log(`  bet ${amount} ${side ? "YES" : "NO"} → tx ${tx.hash}`);
  await tx.wait();
}

async function main() {
  await fhevm.initializeCLIApi();
  const dep = await deployments.get("PredictionMarket");
  const pm = await ethers.getContractAt("PredictionMarket", dep.address);
  const addr = await pm.getAddress();
  const [s0] = await ethers.getSigners();

  const now = Math.floor(Date.now() / 1000);
  const deadline = BigInt(now + 14 * DAY); // open through submission window

  const markets: Array<{ q: string; bets: Array<[number, boolean]> }> = [
    { q: "Will BTC close above $100k on July 1, 2026?", bets: [[100, true], [40, false]] },
    { q: "Will the Zama Builder Track get over 50 submissions?", bets: [[75, true], [60, false]] },
  ];

  for (const m of markets) {
    const tx = await pm.connect(s0).createMarket(m.q, deadline);
    await tx.wait();
    const id = (await pm.marketCount()) - 1n;
    console.log(`Created market ${id}: "${m.q}" (resolver=${s0.address})`);
    for (const [amt, side] of m.bets) {
      await placeBet(pm, addr, s0, id, amt, side);
    }
  }

  const bal = await ethers.provider.getBalance(s0.address);
  console.log(`Done. marketCount=${(await pm.marketCount()).toString()} balance=${ethers.formatEther(bal)} ETH`);
}
main().catch((e) => { console.error(e); process.exit(1); });
