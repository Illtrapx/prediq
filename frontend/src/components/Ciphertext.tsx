import { useState, useEffect } from 'react'
import { randHex } from '../lib/hex'

export function Ciphertext({
  length = 16,
  speed = 110,
  className = '',
}: {
  length?: number
  speed?: number
  className?: string
}) {
  const [text, setText] = useState('•'.repeat(length))

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(randHex(length))
    if (reduce) return
    const t = setInterval(() => {
      if (!document.hidden) setText(randHex(length))
    }, speed)
    return () => clearInterval(t)
  }, [length, speed])

  return <span className={`font-mono tracking-wider ${className}`}>{text}</span>
}
