import { motion } from 'framer-motion'
import { EASE } from '../lib/animations'

// Checkmark that draws its stroke in on mount (SVG pathLength animation),
// inside a circle that scales up softly. Signals a confirmed transaction.
export function AnimatedCheck({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
      />
      <motion.path
        d="M7 12.5l3.5 3.5L17 9"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: EASE, delay: 0.2 }}
      />
    </motion.svg>
  )
}
