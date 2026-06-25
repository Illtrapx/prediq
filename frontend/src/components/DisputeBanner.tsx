import { motion } from 'framer-motion'
import { useCountdown } from '../hooks/useCountdown'
import { fadeUp, fadeIn } from '../lib/animations'

type Props = {
  resolvedAt: number
  resolverAddress: string
  resolutionSource: string | null
  txHash: string | null
}

function formatHMS(remaining: number): string {
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const DISPUTE_WINDOW_SEC = 24 * 3600

export function DisputeBanner({ resolvedAt, resolverAddress, resolutionSource, txHash }: Props) {
  const disputeDeadline = resolvedAt + DISPUTE_WINDOW_SEC
  const countdown = useCountdown(disputeDeadline)

  if (countdown.active) {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="card p-5 border border-amber-500/30 bg-amber-500/[0.04]"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⚖️</span>
          <span className="eyebrow text-amber-400">Resolution Dispute Window</span>
        </div>
        <p className="text-mute text-sm mb-3">
          This market was resolved by its creator. If you believe the outcome is incorrect:
        </p>
        <div className="text-sm mb-3">
          <span className="eyebrow text-mute">Resolution source: </span>
          {resolutionSource ? (
            (() => {
              let safe: string | null = null
              try {
                const u = new URL(resolutionSource)
                if (u.protocol === 'http:' || u.protocol === 'https:') safe = resolutionSource
              } catch { /* ignore */ }
              return safe ? (
                <a
                  href={safe}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink hover:underline break-all"
                >
                  {safe}
                </a>
              ) : (
                <span className="text-mute italic break-all">{resolutionSource}</span>
              )
            })()
          ) : (
            <span className="text-mute italic">Not specified</span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="eyebrow text-mute">Dispute period closes in:</span>
          <span className="font-mono text-amber-400 text-sm tabular-nums">
            {formatHMS(countdown.remaining)}
          </span>
        </div>
        <div className="flex gap-3 flex-wrap">
          <a
            href={`https://sepolia.etherscan.io/address/${resolverAddress}`}
            target="_blank"
            rel="noreferrer"
            className="pill pill-outline px-4 py-2 text-sm"
          >
            Contact Creator ↗
          </a>
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="pill pill-outline px-4 py-2 text-sm"
            >
              View Resolution Tx ↗
            </a>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="show"
      className="card p-4 border border-hairline text-sm text-mute flex items-center gap-2"
    >
      <span>✅</span>
      <span>Dispute period closed · Outcome confirmed</span>
    </motion.div>
  )
}
