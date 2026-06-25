import type { MarketStruct } from '../lib/contract'
import { useCountdown } from '../hooks/useCountdown'

// Live status line driven by the deadline + resolution state.
// - future deadline      → "Closes in Xd Yh Zm" (ticks every second)
// - past deadline, open   → "⏰ CLOSED — awaiting resolution"
// - resolved/finalized    → "✅ Resolved · YES won"
export function MarketCountdown({ market, className = '' }: { market: MarketStruct; className?: string }) {
  const { active, label } = useCountdown(Number(market.resolveDeadline))

  if (market.resolved || market.finalized) {
    return (
      <span className={`eyebrow text-mute ${className}`}>
        ✅ Resolved · {market.winningSide ? 'YES' : 'NO'} won
      </span>
    )
  }

  if (!active) {
    return <span className={`eyebrow text-[#ffc285] ${className}`}>⏰ CLOSED — awaiting resolution</span>
  }

  return (
    <span className={`eyebrow text-body ${className}`}>
      Closes in <span className="text-ink font-mono">{label}</span>
    </span>
  )
}
