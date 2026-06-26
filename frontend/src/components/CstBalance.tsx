import { useState, useEffect, useCallback, useRef } from 'react'
import { ZeroHash, type JsonRpcSigner } from 'ethers'
import { getCSTReadContract } from '../lib/contract'
import { getFhevmInstance } from '../lib/fhevm'
import { CST_ADDRESS } from '../contracts/addresses'
import { AnimatedNumber } from './AnimatedNumber'
import { useToast } from './Toast'

type Props = { address: string | null; signer: JsonRpcSigner | null }

// userDecrypt auth (keypair + EIP-712 signature) is valid for DURATION_DAYS.
// Cache + single-flight it per address so repeated balance reads (mount, faucet,
// post-bet refresh) reuse ONE signature instead of re-prompting the wallet.
const DURATION_DAYS = 1
type Auth = {
  address: string
  keypair: { publicKey: string; privateKey: string }
  sig: string
  startTs: number
}
let authCache: Auth | null = null
let authInFlight: Promise<Auth> | null = null

async function getDecryptAuth(address: string, signer: JsonRpcSigner): Promise<Auth> {
  const now = Math.floor(Date.now() / 1000)
  const valid = (a: Auth | null) =>
    !!a && a.address === address && now < a.startTs + DURATION_DAYS * 86400 - 60
  if (valid(authCache)) return authCache!
  if (authInFlight) {
    const a = await authInFlight
    if (valid(a)) return a
  }
  authInFlight = (async () => {
    const fhevm = await getFhevmInstance()
    const keypair = fhevm.generateKeypair()
    const startTs = Math.floor(Date.now() / 1000)
    const eip712 = fhevm.createEIP712(keypair.publicKey, [CST_ADDRESS], startTs, DURATION_DAYS)
    // ethers v6 derives the EIP712Domain separator itself and rejects it being
    // present in `types` — strip it from the relayer SDK's types before signing.
    const types = { ...(eip712.types as Record<string, unknown>) }
    delete (types as Record<string, unknown>).EIP712Domain
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await signer.signTypedData(eip712.domain as any, types as any, eip712.message as any)
    authCache = { address, keypair, sig, startTs }
    return authCache
  })()
  try {
    return await authInFlight
  } finally {
    authInFlight = null
  }
}

export function CstBalance({ address, signer }: Props) {
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [minting, setMinting] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  // Guard against overlapping decrypts and stale writes after unmount/address change.
  const reqRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!address) { setBalance(null); return }
    const reqId = ++reqRef.current
    setLoading(true)
    setError('')
    try {
      const handle: string = await getCSTReadContract().confidentialBalanceOf(address)
      if (handle === ZeroHash) {
        if (reqRef.current === reqId) setBalance('0')
        return
      }
      if (!signer) {
        if (reqRef.current === reqId) setBalance(null)
        return
      }

      // Reuse a cached EIP-712 signature (one wallet prompt per day) instead of
      // re-signing on every balance read.
      const auth = await getDecryptAuth(address, signer)
      const fhevm = await getFhevmInstance()
      const results = await fhevm.userDecrypt(
        [{ handle: handle as `0x${string}`, contractAddress: CST_ADDRESS }],
        auth.keypair.privateKey,
        auth.keypair.publicKey,
        auth.sig,
        [CST_ADDRESS],
        address,
        auth.startTs,
        DURATION_DAYS,
      )
      const clear = results[handle as `0x${string}`] as bigint
      if (reqRef.current === reqId) setBalance(clear.toString())
    } catch (e: unknown) {
      if (reqRef.current === reqId) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (reqRef.current === reqId) setLoading(false)
    }
  }, [address, signer])

  // Fetch on mount / address change, and on a global refresh event.
  useEffect(() => {
    refresh()
    const handler = () => { refresh() }
    window.addEventListener('cst:refresh', handler)
    return () => { window.removeEventListener('cst:refresh', handler) }
  }, [refresh])

  async function getFaucet() {
    if (!address || minting) return
    setMinting(true)
    setError('')
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Faucet failed (${res.status})`)
      }
      // Confirm shape; txHash not otherwise used.
      await res.json().catch(() => ({}))
      // Optimistic update — the faucet always sends exactly 1000 CST. Bump the
      // displayed balance directly instead of re-reading + decrypting, which
      // would force an EIP-712 signature prompt. The exact on-chain balance
      // reconciles next time the user decrypts (mount / after a bet).
      setBalance(prev => String(Number(prev ?? '0') + 1000))
      toast('1000 test CST sent to your wallet ✓', 'success')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setMinting(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="eyebrow text-mute hidden sm:inline-flex items-center gap-1.5">
        {!address ? (
          ''
        ) : loading ? (
          <>
            <span className="spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
            <span className="font-mono">…</span>
          </>
        ) : balance === null ? (
          <>Balance: <span className="text-ink font-mono">—</span> CST</>
        ) : (
          <>Balance: <AnimatedNumber value={Number(balance)} className="text-ink font-mono" /> CST</>
        )}
      </span>
      <button
        type="button"
        onClick={getFaucet}
        disabled={!address || minting}
        className="pill pill-outline px-3 py-1 text-[13px] disabled:opacity-50"
      >
        {minting && <span className="spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />}
        {minting ? 'Minting…' : 'Get test CST'}
      </button>
      {error && (
        <span className="text-[12px]" style={{ color: '#ffc285' }}>{error}</span>
      )}
    </div>
  )
}
