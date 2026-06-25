# PrediQ — Confidential Prediction Market

> A binary (YES/NO) prediction market where **both the bet amount *and* the side you pick stay encrypted on-chain** until the market resolves.

Built on Zama's **FHEVM** — computation runs directly on ciphertext, so the contract tallies pools and pays out winners **without ever decrypting an individual bet**. This kills the whale-watching, copy-trading, and order-flow front-running that plague public prediction markets.

[![Live demo](https://img.shields.io/badge/demo-prediq--umber.vercel.app-black)](https://prediq-umber.vercel.app)
[![Network](https://img.shields.io/badge/network-Sepolia-627EEA)](https://sepolia.etherscan.io/address/0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9)
[![FHEVM](https://img.shields.io/badge/Zama-FHEVM-ffd208)](https://docs.zama.ai/fhevm)
[![License](https://img.shields.io/badge/license-BSD--3--Clause--Clear-blue)](./LICENSE)

**🔗 Live demo: [prediq-umber.vercel.app](https://prediq-umber.vercel.app)** · live on Sepolia ([contracts below](#deployed-sepolia)).

> Submission for the **Zama Developer Program — Mainnet Season 3, Builder Track**.

---

## Table of Contents

- [The problem](#the-problem)
- [The solution: encrypt the hand, not the result](#the-solution-encrypt-the-hand-not-the-result)
- [Try it (end-to-end walkthrough)](#try-it-end-to-end-walkthrough)
- [How privacy is preserved](#how-privacy-is-preserved)
- [Architecture](#architecture)
- [Lifecycle (contract API)](#lifecycle-contract-api)
- [Contracts](#contracts)
- [Frontend](#frontend)
- [Security & threat model](#security--threat-model)
- [Roadmap / Trust Model](#roadmap--trust-model)
- [Smart-contract development](#smart-contract-development)
- [Stack](#stack)

---

## The problem

On a normal prediction market, every stake and position is public. The consequences are structural, not cosmetic:

- **Whale-watching** — big players are tracked and copied the moment they enter.
- **Copy-trading** — the crowd anchors to whoever bet most, distorting the signal the market is supposed to produce.
- **Front-running** — visible order flow gets sandwiched and picked off.

The information a prediction market exists to aggregate is corrupted by the fact that everyone can see everyone else's hand.

## The solution: encrypt the hand, not the result

PrediQ encrypts the two things that leak an edge — **your stake amount and the side you took** — while keeping the market's *outcome* public. Each bet is FHE ciphertext (`euint64` amount, `ebool` side). The contract adds it into encrypted pools without learning anything about it.

Only the **aggregate** pools are ever revealed, and only **at resolution** — because computing payouts (`stake × totalPool / winningPool`) needs a plaintext divisor, so the winning/total ratio must surface. Individual bets never do.

|                         | Public prediction market | **PrediQ** |
|-------------------------|--------------------------|------------|
| Bet amount              | 👁️ public                | 🔒 encrypted |
| Chosen side             | 👁️ public                | 🔒 encrypted |
| Per-user position       | 👁️ public                | 🔒 encrypted |
| Aggregate pools         | 👁️ public                | 🔒 until resolution |
| Market question / outcome | public                 | public |

---

## Try it (end-to-end walkthrough)

Everything below runs on **Sepolia testnet** at **[prediq-umber.vercel.app](https://prediq-umber.vercel.app)** — no real funds.

### Bet

1. **Connect wallet** — click **Connect Wallet** (RainbowKit). MetaMask or any injected wallet. The app auto-switches you to Sepolia.
2. **Get test CST** — click **Get test CST** in the header. A serverless faucet sends you 1000 **CST** (Confidential Stake Token) — the encrypted asset bets are funded with. Your balance is decrypted client-side and shown as `Balance: X CST`.
3. **Pick a market** (or **Create a market** with a question + deadline; you become its resolver).
4. **Approve once** — before your first bet, click **Approve PredIQ to use your CST**. ERC7984 uses time-bounded *operators* (not ERC-20 allowances), so this authorizes the market to pull your CST. A **✓ CST approved** badge appears.
5. **Bet privately** — choose **YES/NO**, enter a stake, hit **Encrypt & bet**. The amount and side are encrypted **in your browser** (Zama relayer SDK) before the transaction is sent. The chain only sees ciphertext.

### Resolve & Claim

6. **Resolve** — after the deadline, the resolver picks the winning side.
7. **Finalize** — pool totals are decrypted via the Zama KMS relayer and submitted back on-chain with a verifiable proof. Now (and only now) the aggregate pools are public.
8. **Claim** — winners claim; the payout is computed on ciphertext, paid in CST, and revealed to you alone via a private `userDecrypt`.

---

## How privacy is preserved

- **Encrypted pools & stakes** — `euint64` running sums per market; per-user `yesStake` / `noStake` are encrypted too.
- **The side is hidden by construction** — every `bet()` updates *both* pools and *both* user stakes. The non-chosen side adds an encrypted `0` via `FHE.select`, so the storage writes are identical regardless of which side you took — there's no write pattern to leak the choice.
- **No `if` on ciphertext** — all branching is `FHE.select(cond, a, b)`.
- **Stakes aren't self-decryptable during betting** — handles get `FHE.allowThis` only; decrypt rights (`FHE.allow`) are granted to a winner at claim time, closing an ACL side-channel that would otherwise let a bettor confirm their own side.
- **Reveal only at resolve** — pools are flagged `FHE.makePubliclyDecryptable`, decrypted off-chain through the relayer SDK, then submitted back and verified on-chain with `FHE.checkSignatures` (proof bound to handle order + count) plus a replay guard, before any payout math runs.

---

## Architecture

> **The key insight:** `bet()` writes identical storage patterns for YES and NO — there's no write pattern to leak your side.

```
┌─────────── BROWSER ───────────┐        ┌──────────── SEPOLIA ────────────┐
│ React + Vite + RainbowKit     │        │                                  │
│                               │  bet   │  PredictionMarket.sol            │
│ relayer-sdk: encrypt          │ ─────► │   fromExternal(amount, side)     │
│   add64(amount).addBool(side) │ (ct +  │   allowTransient(amt, CST) ──────┼──► ConfidentialStakeToken.sol
│   → handles + inputProof      │ proof) │   CST.confidentialTransferFrom() │    (ERC7984, euint64 balances)
│                               │        │   select → both pools + stakes   │
│                               │        │   allowThis(handles)             │
│ Get test CST  ──────────────► │        │                                  │
│   POST /api/faucet            │        │  resolve(): makePubliclyDecrypt  │
│        │                      │        │            ▲                     │
└────────┼──────────────────────┘        └────────────┼─────────────────────┘
         │                                             │
         ▼  Vercel serverless (deployer wallet)        │ publicDecrypt(pools)
   relayer-sdk node: encrypt 1000 CST           ┌──────┴───────┐
   → CST.confidentialTransfer(user)             │ Zama KMS /   │
                                                │ relayer      │
   finalizePools(clears, proof) ◄───────────────┤ + checkSig   │
   claim(): mul/div on ct → CST.transfer        └──────────────┘
```

**Bet flow (the cross-contract ACL dance):** the market imports the encrypted amount, then `FHE.allowTransient(amt, CST)` so the *separate* token contract can compute on the ciphertext, and pulls funds via `confidentialTransferFrom`. The **returned** funded handle (clamped to balance by ERC7984) is the stake — not the requested amount.

**Reveal flow:** `resolve` → `makePubliclyDecryptable(yesPool, noPool)` → off-chain `publicDecrypt([yesPool, noPool])` → `finalizePools` passes the relayer's verbatim cleartext blob + proof to `FHE.checkSignatures`, then decodes. Handle order is load-bearing.

---

## Lifecycle (contract API)

```
createMarket(question, deadline)        → caller becomes resolver
bet(id, encAmount, encSide, proof)      → both pools + both stakes update (side stays hidden)
resolve(id, winningSide)                → resolver-only, after deadline; flags pools decryptable
finalizePools(id, clears, proof)        → off-chain publicDecrypt → on-chain checkSignatures
claim(id)                               → payout = stake × totalPool / winningPool (paid in CST)
```

Views: `getMarket` · `getPools` · `getStakes` · `getPayout` · `hasClaimed` · `stakeToken`.

---

## Contracts

| Contract | Purpose |
|---|---|
| [`contracts/PredictionMarket.sol`](./contracts/PredictionMarket.sol) | Confidential binary market — full bet → resolve → finalize → claim lifecycle. CST-funded (real encrypted token transfers in/out). Custom errors, ACL grants, and overflow / deadline / empty-market guards throughout. |
| [`contracts/ConfidentialStakeToken.sol`](./contracts/ConfidentialStakeToken.sol) | ERC7984 confidential token (`@openzeppelin/confidential-contracts`) — the encrypted stake asset. Balances and transfers are ciphertext; amounts are not publicly observable. |

### Deployed (Sepolia)

- **PredictionMarket** — [`0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9`](https://sepolia.etherscan.io/address/0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9) (verified) · CST-funded
- **ConfidentialStakeToken** (CST) — [`0xF9B73bF34D8EAb58D3d3498714BF22C2a927463B`](https://sepolia.etherscan.io/address/0xF9B73bF34D8EAb58D3d3498714BF22C2a927463B) (verified)

The full lifecycle has been run end-to-end on real Sepolia (`test/PredictionMarketSepolia.ts`) — the encrypted `publicDecrypt → checkSignatures` round-trip and a CST-funded payout both pass on-chain.

---

## Frontend


React 19 + Vite + TypeScript + Tailwind v4 in [`frontend/`](./frontend). **wagmi v2 + RainbowKit** for wallet connection (MetaMask / injected wallets); Zama [`@zama-fhe/relayer-sdk`](https://docs.zama.ai/protocol/relayer-sdk-guides) for client-side encryption and decryption. See [`frontend/DESIGN.md`](./frontend/DESIGN.md) for the design system.

Notable pieces:
- **`CstBalance`** (header) — reads `confidentialBalanceOf`, decrypts it with a per-session keypair + EIP-712 `userDecrypt`, and shows your live CST balance.
- **Operator gate** — checks `isOperator(user, market)` and walks you through `setOperator` before the bet form unlocks.
- **FHE privacy banner** — a standing reminder on every market page that your amount and side are encrypted and invisible to validators.
- **Polymarket trending suggestions** — the Create Market form surfaces live trending questions from Polymarket as one-click fill-ins.

```bash
cd frontend
npm install
npm run dev      # local dev server
npm run build    # type-check (tsc -b) + production build
```

`frontend/.env.local` needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. COOP headers (`Cross-Origin-Opener-Policy: same-origin-allow-popups`) are set in [`frontend/vercel.json`](./frontend/vercel.json) — COEP is intentionally omitted (it blocks RainbowKit popup flows).

### Faucet API

CST has no public mint — supply is minted to the deployer. The **Get test CST** button calls a Vercel serverless function that transfers CST from the deployer wallet to the requester.

```
POST /api/faucet     body: { "address": "0x…" }
→ 200 { "ok": true, "txHash": "0x…" }      # sends 1000 CST
→ 400 { "error": … }                       # invalid/missing address
→ 405 { "error": … }                       # non-POST
→ 500 { "error": … }                       # misconfig or tx failure
```

Implemented in [`frontend/api/faucet.ts`](./frontend/api/faucet.ts) using the relayer SDK's **node** entry to encrypt the amount server-side and call `confidentialTransfer`. Required Vercel env vars:

| Var | Required | Notes |
|---|---|---|
| `FAUCET_PRIVATE_KEY` | yes | Deployer wallet key (holds the CST supply). **Testnet-only** — never reuse a key with real value. Stored encrypted in Vercel; never shipped to the client. |
| `SEPOLIA_RPC_URL` | no | Defaults to a public Sepolia RPC. |

---

## Security & threat model

**What's hidden:** each bet's amount and side, and every per-user encrypted stake.
**What's public (by design):** the market question, deadline, resolver address, the winning side after `resolve`, and the *aggregate* YES/NO pools after `finalizePools`.

Hardening applied:

- **ACL discipline** — every persisted ciphertext gets an explicit `FHE.allowThis`; cross-contract calls use `FHE.allowTransient` so the CST contract can operate on a handle for exactly one transaction.
- **No stake self-decrypt during betting** — closes a side-channel that would let a bettor confirm their own chosen side from ACL grants.
- **Reveal integrity** — `finalizePools` verifies the relayer's decryption proof on-chain (`FHE.checkSignatures`, bound to handle order/count) and is protected by a `_finalized` replay guard.
- **Input guards** — `DeadlineTooEarly` (no instant-resolve markets), `EmptyMarket` (no `makePubliclyDecryptable` on zero-initialized handles), `PoolValueOverflow` (rejects pool cleartexts that would truncate on the `uint256 → uint64` cast), and a `winningPool == 0` guard before division.

Known limitations (honest scope):

- **Trusted resolver** — the market's resolver sets the outcome. A production deployment would back this with an oracle or dispute mechanism.
- **`euint64` range** — `stake × totalPool` can overflow `euint64` for very large pools (FHE has no overflow check). Fine for a testnet demo; use `euint128` and range guards for production.
- **Division dust** — integer payout division can leave a tiny CST remainder in the contract.

---

## Roadmap / Trust Model

Resolution is currently creator-controlled — the FHE layer solves front-running, not the oracle problem. A 24hr dispute window gives bettors visibility into outcomes before finalization. Future versions will integrate Chainlink or UMA optimistic oracle for trustless resolution.

---

## Smart-contract development

```bash
npm install
npm run compile                                                    # compile + typechain
npm run test                                                       # full suite on the mock FHEVM
npx hardhat test test/PredictionMarketSepolia.ts --network sepolia # real-network E2E
npm run deploy:sepolia                                             # deploy (CST → PredictionMarket)
npx hardhat verify --network sepolia <ADDR>
```

Tests cover the full lifecycle, the revert guards above, and CST-funded bet/claim — exercising the real `publicDecrypt → checkSignatures` round-trip on the mock FHEVM, with a real-Sepolia E2E variant.

Secrets use Hardhat `vars` (`MNEMONIC`, `INFURA_API_KEY`, `ETHERSCAN_API_KEY`), **not** `.env`. Defaults to the throwaway `test … junk` mnemonic so local runs need no setup.

---

## Stack

**[`@fhevm/solidity`](https://docs.zama.ai/fhevm) 0.11** · **[`@zama-fhe/relayer-sdk`](https://docs.zama.ai/protocol/relayer-sdk-guides)** · `@fhevm/hardhat-plugin` (mock FHEVM + encrypt/decrypt test helpers) · `@openzeppelin/confidential-contracts` (ERC7984) · Solidity 0.8.27 (`cancun`) · ethers v6 · TypeChain · React 19 · Vite · Tailwind v4 · wagmi v2 · RainbowKit.

## License

BSD-3-Clause-Clear — see [LICENSE](./LICENSE).
