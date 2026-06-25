import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { EASE } from '../lib/animations'

// ─── Interactive hero widget ─────────────────────────────────────────────────
// Lets the visitor compose a bet (amount + YES/NO) and watch it "encrypt" in
// real time into a euint64-looking ciphertext handle. Every input change
// re-runs the scramble, so the cipher visibly tracks the plaintext — the whole
// point of the product, made tactile.
//
// Pure-render safe: no randomness during render. Scrambling runs in a post-mount
// interval keyed off the current (amount, side). Honours prefers-reduced-motion.

const HEX = '0123456789abcdef'
const HEAD = 12
const TAIL = 6
const TOTAL = HEAD + TAIL

const ENCRYPT_MS = 900
const TICK_MS = 45

// Deterministic hex target derived from the plaintext, so distinct bets resolve
// to distinct, stable ciphertexts (feels like a real handle, not noise).
function targetHex(seed: string): string {
  let h = 0x811c9dc5
  let out = ''
  for (let k = 0; k < TOTAL; k++) {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i) + k * 31
      h = Math.imul(h, 0x01000193) >>> 0
    }
    out += HEX[h & 15]
  }
  return out
}

export function HeroEncryptDemo({ className = '' }: { className?: string }) {
  const [amount, setAmount] = useState('100')
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [cipher, setCipher] = useState('•'.repeat(TOTAL))
  const [resolved, setResolved] = useState(false)

  const startRef = useRef(0)
  const plaintext = `${amount || '0'} CST · ${side}`

  // Re-encrypt whenever the composed plaintext changes.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = targetHex(plaintext)
    setResolved(false)

    if (reduce) {
      setCipher(target)
      setResolved(true)
      return
    }

    startRef.current = Date.now()
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - startRef.current) / ENCRYPT_MS)
      let out = ''
      for (let i = 0; i < TOTAL; i++) {
        const threshold = 0.1 + (i / TOTAL) * 0.85
        out += p >= threshold ? target[i] : HEX[Math.floor(Math.random() * 16)]
      }
      setCipher(out)
      if (p >= 1) {
        setCipher(target)
        setResolved(true)
        clearInterval(timer)
      }
    }, TICK_MS)

    return () => clearInterval(timer)
  }, [plaintext])

  const cipherStr = `0x${cipher.slice(0, HEAD)}…${cipher.slice(HEAD)}`
  const glow = resolved ? { textShadow: '0 0 16px rgba(52, 211, 153, 0.5)' } : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
      className={`card p-6 relative overflow-hidden ${className}`}
    >
      {/* encrypted-field glow */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-[0.12] blur-3xl"
        style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }}
      />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
          <span className="eyebrow">Try it · encrypt a bet</span>
        </div>
        <span className="eyebrow text-[10px] text-mute/60 border border-hairline rounded-full px-2 py-0.5">
          Preview
        </span>
      </div>

      {/* Amount */}
      <label className="eyebrow text-mute block mb-2">Stake amount</label>
      <div className="flex items-center gap-2 mb-5">
        <input
          type="number"
          min={0}
          inputMode="decimal"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="input-xai flex-1 font-mono text-lg"
          placeholder="100"
          aria-label="Stake amount"
        />
        <span className="eyebrow text-mute">CST</span>
      </div>

      {/* Side toggle */}
      <label className="eyebrow text-mute block mb-2">Your side</label>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {(['YES', 'NO'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`pill py-2 text-sm ${side === s ? 'pill-primary' : 'pill-outline'}`}
            aria-pressed={side === s}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Encrypted output */}
      <div className="my-3 flex items-center gap-2 text-mute/50">
        <span className="text-[#34d399]/70">↓</span>
        <span className="eyebrow text-[10px]">FHE encrypt · in your browser</span>
        <span className="flex-1 border-t border-dashed border-hairline" />
      </div>

      <div
        className="font-mono text-sm sm:text-base tracking-wider break-all transition-colors min-h-[1.5em]"
        style={{ color: resolved ? '#6ee7b7' : '#dadbdf', ...glow }}
      >
        {cipherStr}
      </div>

      <div className="eyebrow text-mute mt-2 flex items-center gap-1.5">
        euint64 ciphertext · this is all the chain sees
        <span>🔐</span>
      </div>

      {/* Make it unmistakable this is illustrative, not a live bet */}
      <div className="mt-5 pt-4 border-t border-hairline flex items-center justify-between gap-3">
        <span className="text-mute/60 text-xs leading-snug">
          Preview only — places no bet.
        </span>
        <a href="#markets" className="pill pill-outline px-3 py-1.5 text-[13px] whitespace-nowrap">
          Bet for real →
        </a>
      </div>
    </motion.div>
  )
}
