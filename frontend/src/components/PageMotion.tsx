import { motion } from 'framer-motion'
import { fadeUp } from '../lib/animations'

// Wraps a routed page so it eases in (fadeUp) on mount. Forwards an optional
// className so the page keeps its layout container styles.
export function PageMotion({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={fadeUp} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}
