import type { Variants, Transition } from 'framer-motion'

// ─── Shared motion language ──────────────────────────────────────────────────
// Apple-like: everything eased, nothing bouncy. The signature curve is the
// standard ease-in-out cubic [0.25, 0.1, 0.25, 1] used across page + element
// entrances. Spring presets stay critically-damped (no overshoot) so number
// counters and hovers settle softly instead of wobbling.

export const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

/** Soft, no-overshoot spring for hovers / value changes. */
export const softSpring: Transition = { type: 'spring', stiffness: 220, damping: 30, mass: 0.8 }

/** Springy-but-tame spring for counting numbers (CST balance, win rate). */
export const numberSpring: Transition = { type: 'spring', stiffness: 90, damping: 20, mass: 1 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE } },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } },
}

/** Parent wrapper that staggers its motion children on mount. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

/** Page-level entrance — fadeUp, applied to the root of each routed page. */
export const pageTransition: Variants = fadeUp
