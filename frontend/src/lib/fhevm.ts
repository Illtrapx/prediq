import type { FhevmInstance, createInstance } from '@zama-fhe/relayer-sdk/web'

// Lazy: the relayer SDK (WASM glue, ~1 MB) is only needed when a user actually
// encrypts/decrypts (bet/finalize/claim) — not for browsing markets. Pulling it
// out of the initial bundle via dynamic import below keeps first paint fast.

type Eip1193 = Parameters<typeof createInstance>[0]['network']

let instance: FhevmInstance | null = null
let initPromise: Promise<FhevmInstance> | null = null
let storedProvider: Eip1193 | null = null

// The wallet layer (wagmi/MetaMask) sets the active EIP-1193 provider here.
export function setFhevmProvider(provider: Eip1193) {
  // If the provider identity changes, drop the cached instance so it re-binds.
  if (storedProvider !== provider) {
    storedProvider = provider
    instance = null
    initPromise = null
  }
}

export async function getFhevmInstance(): Promise<FhevmInstance> {
  if (instance) return instance
  if (!storedProvider) throw new Error('No wallet provider set. Connect a wallet first.')
  // Single-flight: if init is already in progress, share the same Promise —
  // no polling loop, no artificial delays.
  if (!initPromise) {
    const provider = storedProvider
    initPromise = (async () => {
      const { createInstance, initSDK, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web')
      await initSDK()
      const inst = await createInstance({ ...SepoliaConfig, network: provider })
      instance = inst
      return inst
    })().catch(err => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}

export function resetFhevmInstance() {
  instance = null
  initPromise = null
  storedProvider = null
}
