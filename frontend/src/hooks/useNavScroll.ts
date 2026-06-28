import { useEffect, type RefObject } from 'react'

// Drives the navbar's morph as a continuous 0→1 progress value over the first
// `range` px of scroll, written straight to the element as the `--nav-p` CSS
// custom property. Every navbar property interpolates off this var in CSS, so
// the bar tracks scroll 1:1 (no state flip) and we never re-render React on
// scroll — the style write happens on the DOM node inside a rAF.
export function useNavScroll(ref: RefObject<HTMLElement | null>, range = 56) {
  useEffect(() => {
    let raf = 0
    const apply = () => {
      raf = 0
      const p = Math.min(1, Math.max(0, window.scrollY / range))
      ref.current?.style.setProperty('--nav-p', p.toFixed(4))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    apply() // sync once on mount (handles reload while already scrolled)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref, range])
}
