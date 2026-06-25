import type { MarketStruct } from '../lib/contract'

// Premium "odds hidden by design" explainer for the market detail page.
// Total pool is euint64 ciphertext until finalize — show it only once revealed.
export function OddsHiddenPanel({ market }: { market: MarketStruct }) {
  const revealed = market.finalized
  const total = revealed ? `${market.totalPool.toString()} CST` : 'Hidden by FHE 🔐'

  return (
    <div className="card p-6 relative overflow-hidden">
      {/* subtle gradient flourish — signals intent, not absence */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.12] blur-2xl"
        style={{ background: 'radial-gradient(circle, #ff7a17, transparent 70%)' }}
      />
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h2 className="text-ink text-lg">Odds are hidden by design</h2>
      </div>
      <p className="text-body text-sm leading-relaxed">
        In traditional prediction markets, visible odds let whales front-run your bets.
        PredIQ hides the pool split using Zama FHE — you bet on what <span className="text-ink">you</span> think
        is true, not what others think.
      </p>
      <div className="mt-5 pt-4 border-t border-hairline flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow text-mute">Total pool</div>
          <div className={`mt-0.5 ${revealed ? 'text-ink font-mono text-xl' : 'text-body text-base'}`}>{total}</div>
        </div>
        <div className="eyebrow text-mute text-right max-w-[50%]">
          Split revealed only after resolution
        </div>
      </div>
    </div>
  )
}
