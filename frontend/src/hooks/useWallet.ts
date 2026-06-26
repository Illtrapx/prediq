import { useState, useEffect } from 'react'
import { BrowserProvider, JsonRpcSigner, type Eip1193Provider } from 'ethers'
import { useAccount, useConnectorClient, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'
import { setFhevmProvider, getFhevmInstance } from '../lib/fhevm'

export type WalletState = {
  ready: boolean
  authenticated: boolean
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  wrongNetwork: boolean
  connect: () => void
  disconnect: () => void
}

export function useWallet(): WalletState {
  const { address, isConnected, isReconnecting, chainId } = useAccount()
  const { data: client } = useConnectorClient()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()

  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [wrongNetwork, setWrongNetwork] = useState(false)

  useEffect(() => {
    if (!isConnected || !client || !address) {
      setProvider(null); setSigner(null); setWrongNetwork(false)
      return
    }
    if (chainId !== sepolia.id) {
      setWrongNetwork(true); setProvider(null); setSigner(null)
      return
    }
    setWrongNetwork(false)

    // viem's connector `client.transport` is an EIP-1193 provider. Hand the raw
    // transport to the FHEVM SDK layer, and wrap it for ethers for contract calls.
    const eip1193 = client.transport as unknown as Eip1193Provider
    setFhevmProvider(eip1193)

    // Pre-warm the FHEVM instance now (WASM import + initSDK compile + KMS key
    // fetch) so the first "Encrypt & bet" pays only for proof generation, not a
    // cold ~1 MB load. No signature needed — createInstance just fetches keys.
    void getFhevmInstance().catch(() => { /* warms on demand if this fails */ })

    const ethersProvider = new BrowserProvider(eip1193, {
      chainId: sepolia.id,
      name: 'sepolia',
    })
    setProvider(ethersProvider)
    setSigner(new JsonRpcSigner(ethersProvider, address))
  }, [isConnected, client, address, chainId])

  return {
    ready: !isReconnecting,
    authenticated: isConnected,
    provider,
    signer,
    address: address ?? null,
    wrongNetwork,
    connect: () => openConnectModal?.(),
    disconnect: () => disconnect(),
  }
}
