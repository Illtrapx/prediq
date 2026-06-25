import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PM_ADDRESS } from '../contracts/addresses'
import { EASE, staggerContainer, fadeUp } from '../lib/animations'

const ETHERSCAN = `https://sepolia.etherscan.io/address/${PM_ADDRESS}`

const POINTS: { icon: string; text: string }[] = [
  { icon: '💰', text: 'Bet amounts are stored as euint64 ciphertext — unreadable on-chain.' },
  { icon: '🎭', text: 'Your chosen side (YES / NO) is encrypted — even validators cannot see it.' },
  { icon: '⚖️', text: 'Both pool totals update on every bet regardless of side — no side-channel leak.' },
  { icon: '🙈', text: 'Even the contract owner cannot see your position.' },
]

export function PrivacyProofPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="text-ink text-sm">🔐 How FHE protects this market</span>
        <span className={`text-mute text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="proof-body"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="overflow-hidden border-t border-hairline"
        >
        <div className="px-5 pb-5 pt-1">
          <motion.ul
            className="flex flex-col gap-3 mt-4"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {POINTS.map(p => (
              <motion.li key={p.text} variants={fadeUp} className="flex gap-3 text-[13px] text-body leading-snug">
                <span className="shrink-0">{p.icon}</span>
                <span>{p.text}</span>
              </motion.li>
            ))}
          </motion.ul>

          <div className="mt-5 pt-4 border-t border-hairline flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="eyebrow text-mute">Contract</div>
              <div className="font-mono text-[12px] text-body truncate">{PM_ADDRESS}</div>
            </div>
            <a
              href={ETHERSCAN}
              target="_blank"
              rel="noreferrer"
              className="pill pill-outline px-4 py-2 text-[12px] shrink-0"
            >
              Verify on Etherscan ↗
            </a>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
