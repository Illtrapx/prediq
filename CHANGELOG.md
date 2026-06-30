# Changelog

All notable changes to PredIQ are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — `Added`, `Changed`, `Fixed`, `Removed`, `Security`.

---

## [Unreleased]

### Added

- GitHub issue templates (bug report, feature request)
- PR template with contract-change and frontend-change checklists
- `CONTRIBUTING.md` with full contributor workflow
- `.editorconfig` for consistent cross-editor formatting
- `CODEOWNERS` for automatic PR review assignment

### Changed

- CI workflow now runs on pull requests in addition to pushes to `main`
- CI includes frontend lint + build step

### Removed

- `ts-generator` from root `devDependencies` (transitive dep of `typechain`, not needed directly)

---

## [1.0.0] — 2025-06

Initial submission for the **Zama Developer Program — Mainnet Season 3, Builder Track**.

### Added

- `PredictionMarket.sol` — core FHE prediction market: `createMarket`, `bet`, `resolve`, `finalizePools`, `claim`
- `ConfidentialStakeToken.sol` — ERC-7984 encrypted token (CST) with `euint64` balances
- Full Hardhat test suite on mock FHEVM (`test/PredictionMarket.ts`)
- Real-network E2E test on Sepolia (`test/PredictionMarketSepolia.ts`)
- React 19 frontend with Vite 7 + Tailwind CSS v4 + framer-motion
- RainbowKit wallet integration (MetaMask, injected wallets)
- Serverless faucet API — one-click 1,000 CST on Sepolia
- Dynamic OG share card generation via `@vercel/og` edge function
- Supabase-backed leaderboard and activity feed
- Polymarket trending feed integration for market creation
- Vercel deployment with CSP, HSTS, and COOP headers
- Deployed on Sepolia:
  - `PredictionMarket`: `0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9`
  - `ConfidentialStakeToken`: `0xF9B73bF34D8EAb58D3d3498714BF22C2a927463B`
