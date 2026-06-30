import type { MarketStruct } from '../lib/contract'

const HIDDEN_TIP =
  'Pool split is hidden by FHE — you cannot see how much is on YES vs NO. This prevents front-running and copy-betting.'

// Pool totals are euint64 ciphertext on-chain. The plaintext total is only known
// AFTER resolution + finalize (market.totalPool); before that it stays hidden.
export function PoolStat({
  market,
  variant = 'card',
}: {
  market: MarketStruct
  variant?: 'card' | 'detail'
}) {
  const revealed = market.finalized
  const label = revealed
    ? `Total Pool: ${market.totalPool.toString()} CST`
    : 'Pool: Hidden by FHE 🔐'

  if (variant === 'detail') {
    return (
      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="eyebrow text-mute">Total pool</div>
          <div
            className={`mt-0.5 ${revealed ? 'text-ink font-mono text-lg' : 'text-body text-sm'}`}
          >
            {revealed ? `${market.totalPool.toString()} CST` : 'Hidden by FHE 🔐'}
          </div>
        </div>
        <span
          className="text-mute text-xs cursor-help"
          role="note"
          aria-label={HIDDEN_TIP}
          tabIndex={0}
        >
          ⓘ
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 eyebrow text-mute">
      <span>{label}</span>
      <span
        className="cursor-help"
        role="note"
        aria-label={HIDDEN_TIP}
        tabIndex={0}
      >
        ⓘ
      </span>
    </div>
  )
}
