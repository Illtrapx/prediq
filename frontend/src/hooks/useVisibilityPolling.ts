import { useEffect } from 'react'

/**
 * Polls `callback` on an interval, pausing when the tab is hidden and resuming
 * on visibility restore. Also fires `callback` once immediately on mount.
 *
 * @param enabled Pass `false` to conditionally disable without unmounting the hook.
 *                Polling stops instantly and restarts when it flips back to `true`.
 */
export function useVisibilityPolling(callback: () => void, intervalMs: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let alive = true
    let t: ReturnType<typeof setInterval> | null = null

    function startPolling() {
      if (t) return
      callback()
      t = setInterval(() => {
        if (alive && !document.hidden) callback()
      }, intervalMs)
    }

    function onVisibility() {
      if (document.hidden) {
        if (t) {
          clearInterval(t)
          t = null
        }
      } else {
        startPolling()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    startPolling()

    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisibility)
      if (t) clearInterval(t)
    }
  }, [callback, intervalMs, enabled])
}
