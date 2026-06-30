import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EASE } from '../lib/animations'

type ToastKind = 'success' | 'info' | 'error'
type Toast = { id: number; kind: ToastKind; message: string }

type ToastCtx = (message: string, kind?: ToastKind) => void
const Ctx = createContext<ToastCtx | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  // No-op fallback if used outside the provider — keeps callers crash-free.
  return ctx ?? (() => {})
}

const ACCENT: Record<ToastKind, string> = {
  success: '#34d399',
  info: '#a0c3ec',
  error: '#ff7a17',
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  const accent = ACCENT[toast.kind]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="relative overflow-hidden card bg-canvas-soft px-4 py-3 pr-5 min-w-[240px] max-w-[340px] shadow-2xl"
      style={{ borderColor: `${accent}55` }}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-sm text-body leading-snug break-words">{toast.message}</span>
      </div>
      {/* auto-dismiss progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px]"
        style={{ background: accent }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 3.4, ease: 'linear' }}
        onAnimationComplete={() => onDone(toast.id)}
      />
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const push = useCallback<ToastCtx>((message, kind = 'info') => {
    const id = ++idRef.current
    setToasts(t => [...t, { id, kind, message }])
  }, [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 items-end pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDone={remove} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
