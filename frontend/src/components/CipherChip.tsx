import { useEffect, useMemo, useState } from 'react'
import { HEX } from '../lib/hex'

// Deterministic ciphertext string from any seed (wallet, txHash, marketId).
// Same seed → same handle, so a row's "encrypted" value is stable across renders.
function seededCipher(seed: string, len: number): string {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let out = ''
  for (let i = 0; i < len; i++) {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    h >>>= 0
    out += HEX[h & 15]
  }
  return out
}

const LEN = 14
const SCRAMBLE_MS = 900
const TICK_MS = 55

// A small `0x…` ciphertext chip that scrambles once on mount then settles —
// the same encrypt-and-resolve motif as EncryptionVisualizer, reused inline in
// list rows to signal that the underlying value lives on-chain as euint64.
export function CipherChip({ seed, className = '' }: { seed: string; className?: string }) {
  const target = useMemo(() => seededCipher(seed, LEN), [seed])
  const [text, setText] = useState(target)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(target)
      setResolved(true)
      return
    }
    setResolved(false)
    const start = Date.now()
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / SCRAMBLE_MS)
      let out = ''
      for (let i = 0; i < target.length; i++) {
        out += p >= i / target.length ? target[i] : HEX[Math.floor(Math.random() * 16)]
      }
      setText(out)
      if (p >= 1) {
        setText(target)
        setResolved(true)
        clearInterval(t)
      }
    }, TICK_MS)
    return () => clearInterval(t)
  }, [target])

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[11px] transition-colors ${className}`}
      style={{
        color: resolved ? 'rgba(110,231,183,0.75)' : 'rgba(125,129,135,0.85)',
        textShadow: resolved ? '0 0 10px rgba(52,211,153,0.35)' : undefined,
      }}
      title="Amount and side are encrypted on-chain as euint64 ciphertext"
    >
      <span aria-hidden="true">🔐</span>
      0x{text.slice(0, 8)}…{text.slice(8)}
    </span>
  )
}
