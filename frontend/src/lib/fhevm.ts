import type { FhevmInstance, createInstance } from '@zama-fhe/relayer-sdk/web'

// Lazy: the relayer SDK (WASM glue, ~1 MB) is only needed when a user actually
// encrypts/decrypts (bet/finalize/claim) — not for browsing markets. Pulling it
// out of the initial bundle via dynamic import below keeps first paint fast.

type Eip1193 = Parameters<typeof createInstance>[0]['network']

let instance: FhevmInstance | null = null
let initializing = false
let storedProvider: Eip1193 | null = null

// The wallet layer (wagmi/MetaMask) sets the active EIP-1193 provider here.
export function setFhevmProvider(provider: Eip1193) {
  // If the provider identity changes, drop the cached instance so it re-binds.
  if (storedProvider !== provider) {
    storedProvider = provider
    instance = null
  }
}

export async function getFhevmInstance(): Promise<FhevmInstance> {
  if (instance) return instance
  if (!storedProvider) throw new Error('No wallet provider set. Connect a wallet first.')
  if (initializing) {
    await new Promise<void>(res => {
      const t = setInterval(() => { if (instance) { clearInterval(t); res() } }, 100)
    })
    return instance!
  }
  initializing = true
  try {
    const { createInstance, initSDK, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web')
    await initSDK()
    instance = await createInstance({ ...SepoliaConfig, network: storedProvider })
  } finally {
    initializing = false
  }
  return instance!
}

export function resetFhevmInstance() {
  instance = null
  initializing = false
  storedProvider = null
}
