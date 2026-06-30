import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EASE } from '../lib/animations'
import { HEX, randHex } from '../lib/hex'

const PLAINTEXTS = ['100 CST · YES', '250 CST · NO', '50 CST · YES', '1000 CST · NO']

// Timeline (ms) for one plaintext.
const ENCRYPT_MS = 1200 // scramble → resolve
const HOLD_MS = 800 // show finished ciphertext
const TICK_MS = 45 // scramble refresh cadence

const HEAD = 10
const TAIL = 4
const TOTAL = HEAD + TAIL

type Variant = 'full' | 'compact'

export function EncryptionVisualizer({
  variant = 'full',
  className = '',
}: {
  variant?: Variant
  className?: string
}) {
  const [cycle, setCycle] = useState(0) // which plaintext + remount key
  const [cipher, setCipher] = useState('•'.repeat(TOTAL))
  const [resolved, setResolved] = useState(false)

  // Mutable per-cycle state kept in refs so the interval body stays cheap.
  const targetRef = useRef(randHex(TOTAL))
  const startRef = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let tickTimer: ReturnType<typeof setInterval> | null = null
    let cycleTimer: ReturnType<typeof setTimeout> | null = null
    let pausedAt: number | null = null

    function stopTimers() {
      if (tickTimer) {
        clearInterval(tickTimer)
        tickTimer = null
      }
      if (cycleTimer) {
        clearTimeout(cycleTimer)
        cycleTimer = null
      }
    }

    function beginCycle() {
      targetRef.current = randHex(TOTAL)
      startRef.current = Date.now()
      setResolved(false)

      if (reduce) {
        setCipher(targetRef.current)
        setResolved(true)
        cycleTimer = setTimeout(() => setCycle(c => c + 1), ENCRYPT_MS + HOLD_MS)
        return
      }

      tickTimer = setInterval(() => {
        const elapsed = Date.now() - startRef.current
        const p = Math.min(1, elapsed / ENCRYPT_MS)
        const target = targetRef.current
        let out = ''
        for (let i = 0; i < TOTAL; i++) {
          const threshold = 0.1 + (i / TOTAL) * 0.85
          out += p >= threshold ? target[i] : HEX[Math.floor(Math.random() * 16)]
        }
        setCipher(out)
        if (p >= 1) {
          setCipher(target)
          setResolved(true)
          if (tickTimer) {
            clearInterval(tickTimer)
            tickTimer = null
          }
          cycleTimer = setTimeout(() => setCycle(c => c + 1), HOLD_MS)
        }
      }, TICK_MS)
    }

    function onVisibilityChange() {
      if (document.hidden) {
        // Pause: record how far through we were, stop timers.
        pausedAt = Date.now()
        stopTimers()
      } else {
        // Resume: shift the start time forward by the hidden duration so the
        // animation continues where it left off instead of jumping.
        if (pausedAt !== null) {
          startRef.current += Date.now() - pausedAt
          pausedAt = null
        }
        if (!reduce) beginCycle()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    if (!document.hidden) beginCycle()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopTimers()
    }
  }, [cycle])

  const plaintext = PLAINTEXTS[cycle % PLAINTEXTS.length]
  const cipherStr = `0x${cipher.slice(0, HEAD)}…${cipher.slice(HEAD)}`
  const glow = resolved ? { textShadow: '0 0 14px rgba(52, 211, 153, 0.55)' } : undefined

  // ── Compact: single inline strip for the market-list header ────────────────
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 font-mono text-[12px] ${className}`}>
        <AnimatePresence mode="wait">
          <motion.span
            key={`p-${cycle}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="text-mute"
          >
            {plaintext}
          </motion.span>
        </AnimatePresence>
        <span className="text-mute/40">→</span>
        <span
          className="transition-colors"
          style={{ color: resolved ? '#6ee7b7' : 'rgba(125,129,135,0.8)', ...glow }}
        >
          {cipherStr}
        </span>
      </div>
    )
  }

  // ── Full: a self-contained card showing the before → after transform ───────
  return (
    <div className={`card p-5 relative overflow-hidden ${className}`}>
      {/* faint encrypted-field glow in the corner */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-[0.10] blur-2xl"
        style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }}
      />

      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
        <span className="eyebrow">Live encryption</span>
      </div>

      <div className="eyebrow text-mute mb-1.5">Your bet · before FHE encryption →</div>
      <div className="h-8 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`pt-${cycle}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="font-mono text-lg text-ink"
          >
            {plaintext}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* transform arrow */}
      <div className="my-2 flex items-center gap-2 text-mute/50">
        <span className="text-[#34d399]/70">↓</span>
        <span className="eyebrow text-[10px]">FHE encrypt (in your browser)</span>
        <span className="flex-1 border-t border-dashed border-hairline" />
      </div>

      <div
        className="font-mono text-base sm:text-lg tracking-wider break-all transition-colors"
        style={{ color: resolved ? '#6ee7b7' : '#dadbdf', ...glow }}
      >
        {cipherStr}
      </div>

      <div className="eyebrow text-mute mt-2 flex items-center gap-1.5">
        euint64 ciphertext · stored on-chain
        <span>🔐</span>
      </div>
    </div>
  )
}
