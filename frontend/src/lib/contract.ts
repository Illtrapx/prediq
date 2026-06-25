import { Contract, JsonRpcProvider, type ContractRunner } from 'ethers'
import PredictionMarketABI from '../contracts/PredictionMarket.json'
import ConfidentialStakeTokenABI from '../contracts/ConfidentialStakeToken.json'
import { PM_ADDRESS, CST_ADDRESS } from '../contracts/addresses'

// Dedicated read-only RPC. Routing view calls through the wallet provider
// (MetaMask) causes "Wallet timeout" on eth_blockNumber etc.
// staticNetwork avoids repeated eth_chainId probes.
const READ_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
export const readProvider = new JsonRpcProvider(
  READ_RPC,
  { chainId: 11155111, name: 'sepolia' },
  { staticNetwork: true },
)

export function getPMContract(runner: ContractRunner) {
  return new Contract(PM_ADDRESS, PredictionMarketABI.abi, runner)
}

// Read-only contract bound to the public RPC — use for all view calls.
export function getPMReadContract() {
  return new Contract(PM_ADDRESS, PredictionMarketABI.abi, readProvider)
}

// ── Confidential Stake Token (CST) — the ERC7984 stake currency ────────────────
export function getCSTContract(runner: ContractRunner) {
  return new Contract(CST_ADDRESS, ConfidentialStakeTokenABI.abi, runner)
}

// Read-only CST contract bound to the public RPC — use for view calls
// (confidentialBalanceOf, isOperator, …).
export function getCSTReadContract() {
  return new Contract(CST_ADDRESS, ConfidentialStakeTokenABI.abi, readProvider)
}

export type MarketStruct = {
  question: string
  resolveDeadline: bigint
  resolver: string
  resolved: boolean
  winningSide: boolean
  finalized: boolean
  hasBets: boolean
  totalPool: bigint
  winningPool: bigint
}
