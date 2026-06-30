# Contributing to PredIQ

Thanks for your interest. Contributions are welcome — from bug reports to contract improvements to UI polish.

## Quick start

```bash
git clone https://github.com/Illtrapx/prediq.git
cd prediq
npm install          # root: Hardhat + contract tooling
cd frontend && npm install   # frontend: React + Vite
```

## Repo layout

```
zamafhe/
├── contracts/       # Solidity (Hardhat + FHEVM)
├── deploy/          # hardhat-deploy scripts
├── test/            # Hardhat tests (mock FHEVM + Sepolia E2E)
├── frontend/
│   ├── api/         # Vercel serverless functions
│   └── src/         # React 19 app
└── docs/
    └── screenshots/ # UI screenshots used in README
```

## Workflow

1. **Open an issue first** for non-trivial changes — saves everyone time.
2. Fork the repo and create a branch: `git checkout -b feat/your-feature`
3. Make changes; run quality checks (see below).
4. Open a PR against `main`.

## Quality checks

### Contracts (root)

```bash
npm run compile      # Solidity compile + TypeChain
npm test             # Full suite on mock FHEVM (no funds needed)
npm run lint         # ESLint + Prettier + Solhint
npm run coverage     # solidity-coverage report
```

### Frontend

```bash
cd frontend
npm run lint         # ESLint
npm run build        # tsc + Vite build (catches type errors)
```

Run `npm run prettier:write` from the root before committing to auto-format everything.

## Adding contract features

- Tests are mandatory. The `@fhevm/hardhat-plugin` mock supports the full FHE API locally — no Sepolia keys or funds
  needed.
- Keep ACL discipline: every persisted ciphertext gets `FHE.allowThis`; cross-contract handles use `FHE.allowTransient`.
- Any ABI change needs a corresponding TypeChain regeneration (`npm run compile`) and a frontend update in
  `src/lib/contract.ts`.

## Adding frontend features

- New dependencies need justification — bundle size matters. Check if an existing dep already covers the use case
  (`viem`, `wagmi`, `framer-motion`, `ethers` are all available).
- New env vars must be documented in the README's **Environment variables** table.
- UI changes should include screenshots or a screen recording in the PR.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(contract): add oracle-backed resolution
fix(frontend): prevent double-submit on bet button
chore: bump hardhat to 2.29
docs: add dispute flow to README
```

Subject ≤ 72 chars. Body explains _why_, not _what_ (the diff already says what).

## Code style

Prettier + ESLint enforce everything automatically. One rule that isn't auto-enforced: **no comments that explain what
the code does** — rename the symbol instead. Comments should only explain _why_ (hidden constraint, subtle invariant,
workaround for a specific bug).

## Sensitive information

- **Never commit private keys, mnemonics, or `.env` files.** Hardhat vars (`npx hardhat vars set`) keep secrets out of
  the repo.
- Vercel secrets stay in the Vercel dashboard.
- If you accidentally commit a secret, rotate it immediately and open an issue.

## License

By contributing, you agree your contributions are licensed under the same [BSD-3-Clause-Clear](./LICENSE) terms as the
project.
