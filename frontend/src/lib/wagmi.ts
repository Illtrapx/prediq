import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { sepolia } from 'wagmi/chains'

// Bare wagmi `injected()` connector only (MetaMask et al.). Deliberately NOT
// RainbowKit's connectorsForWallets / getDefaultConfig — those pull the
// WalletConnect relay + Reown AppKit + metamask-sdk stacks (~1.5 MB) we never
// use. RainbowKitProvider still renders its modal over this config (the
// injected wallet shows as "Browser Wallet"). No WalletConnect = no projectId,
// no empty-VITE_ env footgun.
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC),
  },
  ssr: false,
})
