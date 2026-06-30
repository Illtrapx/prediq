import { useState, useEffect } from 'react'

export type Countdown = {
  remaining: number // seconds remaining; 0 when past deadline
  active: boolean // true while remaining > 0
  label: string // "2d 4h 3m" | "1h 5m 30s" | "45s"
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
 * @param deadline Unix timestamp in seconds. Ticks every second (pauses when tab is hidden).
 */
export function useCountdown(deadline: number): Countdown {
  const compute = (): number => Math.max(0, deadline - Math.floor(Date.now() / 1000))
  const [remaining, setRemaining] = useState<number>(compute)

  useEffect(() => {
    setRemaining(compute())
    const t = setInterval(() => {
      if (!document.hidden) setRemaining(compute())
    }, 1000)

    function onVisibility() {
      if (!document.hidden) setRemaining(compute())
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline])

  return { remaining, active: remaining > 0, label: format(remaining) }
}
