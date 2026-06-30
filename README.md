<div align="center">

<h1>( • ) PredIQ</h1>
<p><strong>Confidential prediction markets powered by Fully Homomorphic Encryption</strong></p>
<p><em>Bet without revealing your hand.</em></p>

<p>
  <a href="https://prediq-umber.vercel.app"><img src="https://img.shields.io/badge/live%20demo-prediq--umber.vercel.app-black?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
</p>

<p>
  <a href="https://github.com/Illtrapx/prediq/actions/workflows/main.yml"><img src="https://github.com/Illtrapx/prediq/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
  <a href="https://sepolia.etherscan.io/address/0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9"><img src="https://img.shields.io/badge/network-Sepolia-627EEA?logo=ethereum" alt="Sepolia" /></a>
  <a href="https://docs.zama.ai/fhevm"><img src="https://img.shields.io/badge/Zama-FHEVM%200.11-ffd208" alt="FHEVM" /></a>
  <img src="https://img.shields.io/badge/solidity-0.8.27-363636?logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/react-19-61dafb?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/typescript-6-3178c6?logo=typescript" alt="TypeScript" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-BSD--3--Clause--Clear-blue" alt="License" /></a>
</p>

<p>
  Submission for the <strong>Zama Developer Program — Mainnet Season 3, Builder Track</strong>.
</p>

</div>

---

## Table of Contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [Features](#features)
- [Screenshots](#screenshots)
- [Demo](#demo)
- [Architecture](#architecture)
- [Contract API](#contract-api)
- [Deployed contracts](#deployed-contracts-sepolia)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Deployment](#deployment)
- [API overview](#api-overview)
- [Security & threat model](#security--threat-model)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## The problem

On every public prediction market, every stake and position is visible to everyone. The consequences are structural:

- **Whale-watching** — large players get tracked and copied the moment they enter.
- **Copy-trading** — the crowd anchors to whoever bet most, corrupting the price signal the market is supposed to produce.
- **Front-running** — visible order flow gets sandwiched and picked off.

The information a prediction market exists to aggregate is destroyed by the fact that everyone can see everyone else's hand.

## The solution

PredIQ encrypts the two things that leak an edge — **your stake amount and the side you picked** — while keeping the market *outcome* public. Each bet is FHE ciphertext. The contract tallies pools and pays out winners entirely on ciphertext, without ever seeing an individual bet. Only the aggregate pools are revealed, and only at resolution.

| | Public markets | **PredIQ** |
|---|---|---|
| Bet amount | 👁️ public | 🔒 encrypted |
| Chosen side | 👁️ public | 🔒 encrypted |
| Per-user position | 👁️ public | 🔒 encrypted |
| Aggregate pools | 👁️ public | 🔒 until resolution |
| Market question / outcome | public | public |

---

## Features

- **Fully encrypted bets** — amount and side are encrypted in the browser via Zama relayer SDK before the transaction is sent; the chain only ever sees ciphertext
- **Indistinguishable write patterns** — every `bet()` updates both pools and both user stakes (the non-chosen side adds an encrypted `0` via `FHE.select`), making storage writes identical regardless of which side you took
- **ACL-gated decryption** — decrypt rights are only granted to a winner at claim time, closing the side-channel that would otherwise let anyone confirm a bettor's side
- **On-chain reveal integrity** — pool totals are decrypted via the Zama KMS relayer and submitted back with a verifiable proof, checked on-chain with `FHE.checkSignatures` before any payout math runs
- **ERC-7984 confidential token (CST)** — bets are funded with an encrypted token; transfer amounts are ciphertext end-to-end
- **Testnet faucet** — one click to receive 1,000 CST, handled by a serverless function so the deployer key never leaves the server
- **Dynamic OG share cards** — shareable bet confirmation images generated server-side via `@vercel/og` edge function
- **Polymarket trending feed** — Create Market form surfaces live trending questions as one-click fill-ins
- **Leaderboard** — activity feed tracking bets and claims, stored in Supabase
- **Category filtering** — markets tagged and filterable (Crypto, Sports, Politics, Other)

---

## Screenshots

> The UI is dark-first, minimal, and motion-driven. All screenshots taken on Sepolia testnet.

| Market list | Market detail | My bets |
|---|---|---|
| ![Market list](docs/screenshots/markets.png) | ![Market detail](docs/screenshots/detail.png) | ![My bets](docs/screenshots/mybets.png) |

> **Note:** Drop `docs/screenshots/markets.png`, `detail.png`, and `mybets.png` into the repo to populate the table above.

---

## Demo

**Live at [prediq-umber.vercel.app](https://prediq-umber.vercel.app)** — no real funds, everything runs on Sepolia testnet.

### End-to-end walkthrough

**Setup (one-time)**

1. **Connect wallet** — click **Connect Wallet** (RainbowKit). MetaMask or any injected wallet. The app auto-switches you to Sepolia.
2. **Get test CST** — click **Get test CST** in the header. A serverless faucet sends you 1,000 CST (ConfidentialStakeToken), the encrypted asset bets are funded with.
3. **Approve once** — before your first bet, click **Approve PredIQ to use your CST**. ERC-7984 uses time-bounded *operators* (not ERC-20 allowances), so this authorizes the market to pull your CST.

**Betting**

4. **Pick a market** — or **Create a market** with a question and resolve deadline (you become its resolver).
5. **Bet privately** — choose YES/NO, enter a stake, hit **Encrypt & bet**. Amount and side are encrypted in your browser before the transaction is broadcast. The chain only sees ciphertext.

**Resolution**

6. **Resolve** — after the deadline, the resolver declares the winning side.
7. **Finalize** — aggregate pools are decrypted off-chain via the Zama KMS relayer and submitted back with a verifiable proof (`finalizePools`). Only now are pool totals public.
8. **Claim** — winners claim. Payout is computed on ciphertext, paid in CST, and revealed to you alone via `userDecrypt`.

---

## Architecture

```
┌─────────────── BROWSER ───────────────┐        ┌──────────── SEPOLIA ──────────────────┐
│  React 19 + Vite + RainbowKit         │        │                                        │
│                                       │  bet   │  PredictionMarket.sol                  │
│  relayer-sdk: encrypt                 │ ─────► │   fromExternal(amount, side)            │
│    add64(amount).addBool(side)        │ (ct +  │   allowTransient(amt, CST) ────────────┼──► ConfidentialStakeToken.sol
│    → handles + inputProof             │ proof) │   CST.confidentialTransferFrom()        │    (ERC7984, euint64 balances)
│                                       │        │   FHE.select → both pools + stakes      │
│                                       │        │   FHE.allowThis(handles)                │
│  Get test CST ──────────────────────► │        │                                        │
│    POST /api/faucet                   │        │  resolve(): makePubliclyDecryptable     │
│          │                            │        │              ▲                          │
└──────────┼────────────────────────────┘        └──────────────┼───────────────────────── ┘
           │                                                     │
           ▼  Vercel serverless (deployer wallet)                │ publicDecrypt([yesPool, noPool])
     relayer-sdk node: encrypt 1000 CST                  ┌───────┴──────────┐
     → CST.confidentialTransfer(user)                    │  Zama KMS /      │
                                                         │  relayer         │
     finalizePools(clears, proof) ◄──────────────────────┤  + checkSig      │
     claim(): mul/div on ct → CST.transfer               └──────────────────┘
```

**Key insight — indistinguishable write pattern:** `bet()` writes to both the YES pool and the NO pool (and both user stake slots) on every call. The non-chosen side adds an encrypted `0` via `FHE.select`. There is no write pattern to leak which side you took.

**Cross-contract ACL dance:** the market imports your encrypted amount, calls `FHE.allowTransient(amt, CST)` so the *separate* token contract can compute on the handle for exactly one transaction, then calls `confidentialTransferFrom`. The funded handle returned (clamped to your actual balance by ERC-7984) becomes the stake — not the requested amount.

**Reveal flow:** `resolve` → `makePubliclyDecryptable(yesPool, noPool)` → off-chain `publicDecrypt([yesPool, noPool])` → `finalizePools` passes the relayer's verbatim cleartext blob + proof to `FHE.checkSignatures` (bound to handle order + count), then decodes pool totals for payout math.

---

## Contract API

```
createMarket(question, deadline)         → caller becomes resolver
bet(id, encAmount, encSide, proof)       → both pools + both stakes update (side stays hidden)
resolve(id, winningSide)                 → resolver-only, after deadline; flags pools decryptable
finalizePools(id, clears, proof)         → publicDecrypt output → checkSignatures → decode pools
claim(id)                                → payout = stake × totalPool / winningPool (paid in CST)
```

Views: `getMarket` · `getPools` · `getStakes` · `getPayout` · `hasClaimed` · `stakeToken`

---

## Deployed contracts (Sepolia)

| Contract | Address |
|---|---|
| `PredictionMarket` | [`0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9`](https://sepolia.etherscan.io/address/0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9) |
| `ConfidentialStakeToken` (CST) | [`0xF9B73bF34D8EAb58D3d3498714BF22C2a927463B`](https://sepolia.etherscan.io/address/0xF9B73bF34D8EAb58D3d3498714BF22C2a927463B) |

Both verified on Etherscan. The full lifecycle has been exercised end-to-end on real Sepolia (`test/PredictionMarketSepolia.ts`) — the encrypted `publicDecrypt → checkSignatures` round-trip and a CST-funded payout both pass on-chain.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Smart contracts** | Solidity 0.8.27 (`cancun`), `@fhevm/solidity` 0.11, `@openzeppelin/confidential-contracts` (ERC-7984) |
| **FHE types** | `euint64` (encrypted amounts), `ebool` (encrypted YES/NO), `FHE.select` (branchless conditionals), `euint128` (payout arithmetic) |
| **FHE runtime** | Zama FHEVM (Sepolia co-processor), `@zama-fhe/relayer-sdk` (client + server), Zama KMS relayer |
| **Contract tooling** | Hardhat 2, `@fhevm/hardhat-plugin` (mock FHEVM), TypeChain, hardhat-deploy, hardhat-verify, solidity-coverage |
| **Frontend** | React 19, TypeScript 6, Vite 7, Tailwind CSS v4, framer-motion |
| **Web3** | ethers v6, wagmi v2, viem, RainbowKit |
| **Data fetching** | `@tanstack/react-query` |
| **Off-chain storage** | Supabase (market categories, faucet claims) |
| **Serverless API** | Vercel (Node.js serverless + Edge runtime) |
| **OG images** | `@vercel/og` edge function |

---

## Folder structure

```
zamafhe/
├── contracts/
│   ├── PredictionMarket.sol        # Core market: bet → resolve → finalize → claim
│   └── ConfidentialStakeToken.sol  # ERC-7984 confidential token (encrypted balances)
├── deploy/
│   └── deploy.ts                   # hardhat-deploy: CST first, then PredictionMarket
├── test/
│   ├── PredictionMarket.ts         # Full suite on mock FHEVM
│   └── PredictionMarketSepolia.ts  # Real-network E2E test
├── tasks/                          # Hardhat task helpers
├── frontend/
│   ├── api/
│   │   ├── _lib/config.ts          # Shared API config (addresses, Supabase client)
│   │   ├── faucet.ts               # POST /api/faucet — transfers 1,000 CST
│   │   ├── og.ts                   # GET /api/og — edge OG image renderer
│   │   └── share.ts                # GET /api/share — share card HTML (short links)
│   ├── src/
│   │   ├── components/             # UI components (MarketCard, ActivityFeed, Logo, …)
│   │   ├── hooks/                  # Custom hooks (useWallet, useCountdown, useVisibilityPolling, …)
│   │   ├── lib/                    # Utilities (contract, fhevm, eip712, constants, market, …)
│   │   ├── pages/                  # Route pages (MarketListPage, MarketDetailPage, …)
│   │   └── contracts/addresses.ts  # Deployed contract addresses
│   ├── vercel.json                 # Security headers + rewrites
│   └── vite.config.ts
├── hardhat.config.ts
└── package.json
```

---

## Installation

**Prerequisites:** Node.js ≥ 20, npm ≥ 10

```bash
# Clone
git clone https://github.com/Illtrapx/prediq.git
cd prediq

# Install root (contract tooling)
npm install

# Install frontend
cd frontend && npm install
```

---

## Environment variables

### Frontend — `frontend/.env.local`

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Supabase publishable anon key (safe to expose to browser) |

### Vercel serverless API — Vercel project settings (or `frontend/.env.local` for local dev)

| Variable | Required | Description |
|---|---|---|
| `FAUCET_PRIVATE_KEY` | yes | Deployer wallet private key — holds the CST supply. **Testnet-only. Never commit.** |
| `SUPABASE_URL` | no | Falls back to `VITE_SUPABASE_URL` |
| `SUPABASE_KEY` | no | Falls back to `VITE_SUPABASE_ANON_KEY` |
| `SEPOLIA_RPC_URL` | no | Defaults to a public Sepolia RPC |
| `APP_ORIGIN` | no | Canonical origin for OG/share URLs (defaults to `https://prediq-umber.vercel.app`) |

### Hardhat — use `npx hardhat vars set`, not `.env`

```bash
npx hardhat vars set MNEMONIC           # deployer wallet mnemonic
npx hardhat vars set INFURA_API_KEY     # or any Sepolia RPC provider key
npx hardhat vars set ETHERSCAN_API_KEY  # for contract verification
```

Hardhat defaults to the throwaway `test … junk` mnemonic so local runs need no setup.

---

## Running locally

### Smart contracts

```bash
# Compile + generate TypeChain types
npm run compile

# Run full test suite on the mock FHEVM (no network or funds needed)
npm test

# Real-network E2E (requires Hardhat vars set above)
npm run test:sepolia

# Deploy to Sepolia
npm run deploy:sepolia

# Verify on Etherscan
npm run verify:sepolia
```

### Frontend dev server

```bash
cd frontend
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Type-check (tsc -b) + production build
npm run lint       # ESLint
```

The frontend connects to the already-deployed Sepolia contracts by default — no local contract deployment needed.

---

## Deployment

### Contracts (Sepolia)

```bash
npm run deploy:sepolia    # deploys CST then PredictionMarket
npm run verify:sepolia    # verifies both on Etherscan
```

Update `frontend/src/contracts/addresses.ts` with the new addresses after redeployment.

### Frontend (Vercel)

Connect the repo to Vercel, set **Root Directory** to `frontend/`, and add the env vars listed above. Or deploy manually:

```bash
cd frontend
npx vercel          # preview deploy
npx vercel --prod   # production deploy
```

`vercel.json` configures security headers and rewrites automatically:

- `Cross-Origin-Opener-Policy: same-origin-allow-popups` — required for RainbowKit popup flows (COEP intentionally omitted for the same reason)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`
- `Content-Security-Policy` scoped to Sepolia RPC + Supabase + Zama relayer origins
- `/m/:id` rewrites to `/api/share?id=:id` for short shareable bet links

---

## API overview

All routes live in `frontend/api/` and run as Vercel functions.

### `POST /api/faucet`

Sends 1,000 CST from the deployer wallet to a Sepolia address.

```http
POST /api/faucet
Content-Type: application/json

{ "address": "0x…" }
```

| Status | Body |
|---|---|
| `200` | `{ "ok": true, "txHash": "0x…" }` |
| `400` | `{ "error": "…" }` — invalid or missing address |
| `405` | `{ "error": "…" }` — non-POST request |
| `500` | `{ "error": "…" }` — misconfigured env or tx failure |

Implementation: `frontend/api/faucet.ts` — uses the relayer SDK's Node.js entry to encrypt the amount server-side and call `confidentialTransfer`. The deployer key is a Vercel secret and never shipped to the client.

### `GET /api/og`

Generates an OG image for a market (edge runtime — streams immediately, no cold-start delay).

```
GET /api/og?id=<marketId>&q=<question>&side=<YES|NO>
```

Returns `image/png`, suitable for `<meta property="og:image">`.

### `GET /api/share`

Renders a share card HTML page for a bet (used by `/m/:id` short links and X share previews).

```
GET /api/share?id=<marketId>
```

---

## Security & threat model

**What's hidden:** each bet's amount and side; every per-user encrypted stake.

**What's public (by design):** market question, deadline, resolver address, the winning side after `resolve`, and the aggregate YES/NO pools after `finalizePools`.

**Hardening applied:**

- **ACL discipline** — every persisted ciphertext gets `FHE.allowThis`; cross-contract calls use `FHE.allowTransient` so the CST contract can operate on a handle for exactly one transaction
- **No stake self-decrypt during betting** — closes the ACL side-channel that would otherwise let a bettor confirm their own chosen side from ACL grants
- **Reveal integrity** — `finalizePools` verifies the relayer's decryption proof on-chain (`FHE.checkSignatures`, bound to handle order and count) and is replay-guarded by `_finalized`
- **Input guards** — `DeadlineTooEarly` (prevents instant-resolve markets), `EmptyMarket` (prevents `makePubliclyDecryptable` on zero-initialized handles), `PoolValueOverflow` (rejects pool values that would truncate on `uint256 → uint64` cast), `winningPool == 0` guard before division
- **Host header injection mitigated** — API origin controlled by server-side env var; never derived from `Host` or `x-forwarded-host` request headers

**Known limitations (honest testnet scope):**

- **Trusted resolver** — the resolver sets the outcome unilaterally. A production deployment needs an oracle or dispute mechanism.
- **`euint64` range** — `stake × totalPool` can overflow for very large pools. Use `euint128` + range guards for production.
- **Division dust** — integer payout division can leave a tiny CST remainder locked in the contract.

---

## Roadmap

- [ ] **Oracle-backed resolution** — Chainlink or UMA optimistic oracle so resolvers can't manipulate outcomes
- [ ] **Dispute window** — 24-hour challenge period before finalization; bettors can flag incorrect resolutions
- [ ] **Multi-choice markets** — extend beyond binary YES/NO to multi-outcome (`euint64[]` pools)
- [ ] **`euint128` arithmetic** — replace pool arithmetic to eliminate overflow risk on high-volume markets
- [ ] **Batch finalization bot** — off-chain service that calls `finalizePools` automatically after every `resolve`
- [ ] **Mobile wallet support** — WalletConnect integration (currently excluded to avoid the 1.5 MB WalletConnect + Reown bundle)
- [ ] **Mainnet CST supply** — confidential mint function gated by ETH payment
- [ ] **Time-weighted odds display** — show pool imbalance trends without leaking raw pool sizes

---

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow. Short version:

```bash
git checkout -b feat/your-feature
npm run lint && npm test          # root: contracts
cd frontend && npm run lint && npm run build  # frontend

git push origin feat/your-feature
# open a pull request against main
```

Open an issue first for non-trivial changes.

---

## License

[BSD-3-Clause-Clear](./LICENSE)

---

<div align="center">
  <sub>Built with <a href="https://docs.zama.ai/fhevm">Zama FHEVM</a> · Submitted to the Zama Developer Program Mainnet Season 3, Builder Track</sub>
</div>
