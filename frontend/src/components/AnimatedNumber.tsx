import { useEffect } from 'react'
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion'
import { numberSpring } from '../lib/animations'

// Smoothly animates a number toward `value` with a critically-damped spring.
// Used for the CST balance (counts up/down on change) and leaderboard win rate
// (counts up from 0 on first load).
export function AnimatedNumber({
  value,
  decimals = 0,
  className = '',
  suffix = '',
}: {
  value: number
  decimals?: number
  className?: string
  suffix?: string
}) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, numberSpring)
  const text = useTransform(spring, latest => `${latest.toFixed(decimals)}${suffix}`)

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  return <motion.span className={className}>{text}</motion.span>
}
