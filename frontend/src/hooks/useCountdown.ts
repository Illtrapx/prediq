import { useState, useEffect } from 'react'

export type Countdown = {
  /** seconds remaining until deadline (0 if passed) */
  remaining: number
  /** true while deadline is still in the future */
  active: boolean
  /** "Xd Yh Zm" / "Yh Zm Ws" style label for the time left */
  label: string
}

function format(remaining: number): string {
  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Live countdown to a unix-seconds deadline. Ticks every second.
 * @param deadline unix timestamp (seconds)
 */
export function useCountdown(deadline: number): Countdown {
  const compute = (): number => Math.max(0, deadline - Math.floor(Date.now() / 1000))
  const [remaining, setRemaining] = useState<number>(compute)

  useEffect(() => {
    // resync immediately on deadline change
    setRemaining(compute)
    const t = setInterval(() => setRemaining(compute), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline])

  return { remaining, active: remaining > 0, label: format(remaining) }
}
