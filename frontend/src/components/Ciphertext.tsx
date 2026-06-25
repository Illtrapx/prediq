import { useState, useEffect } from 'react'

const HEX = '0123456789abcdef'

function randHex(n: number): string {
  let out = ''
  for (let i = 0; i < n; i++) out += HEX[Math.floor(Math.random() * 16)]
  return out
}

/**
 * Animated scrambling hex — a visual stand-in for ciphertext.
 * Reshuffles on an interval; starts from a static seed so render stays pure.
 */
export function Ciphertext({ length = 16, speed = 110, className = '' }: { length?: number; speed?: number; className?: string }) {
  const [text, setText] = useState('•'.repeat(length))

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Intentional: render stays pure (static seed); animation starts post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(randHex(length))
    if (reduce) return
    const t = setInterval(() => setText(randHex(length)), speed)
    return () => clearInterval(t)
  }, [length, speed])

  return <span className={`font-mono tracking-wider ${className}`}>{text}</span>
}
