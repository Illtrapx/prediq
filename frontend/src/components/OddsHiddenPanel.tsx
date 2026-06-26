import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { EventLog } from 'ethers'
import type { MarketStruct } from '../lib/contract'
import { getPMReadContract } from '../lib/contract'
import { Ciphertext } from './Ciphertext'

// Premium "odds hidden by design" explainer for the market detail page.
// Total pool is euint64 ciphertext until finalize — show it only once revealed.
// Pre-reveal, the panel still feels alive: a live encrypted-bet counter and a
// scrambling ciphertext stand-in for the growing (but hidden) pool.
export function OddsHiddenPanel({ market, marketId }: { market: MarketStruct; marketId: number }) {
  const revealed = market.finalized

  // Live count of encrypted bets — public (BetPlaced fires per bet) while the
  // amounts/sides stay ciphertext. Polls so the number climbs during a demo.
  const [betCount, setBetCount] = useState<number | null>(null)
  useEffect(() => {
    if (revealed) return
    let alive = true
    const c = getPMReadContract()
    const load = () =>
      c.queryFilter(c.filters.BetPlaced(marketId))
        .then(logs => { if (alive) setBetCount((logs as EventLog[]).length) })
        .catch(() => { if (alive) setBetCount(prev => prev ?? 0) })
    void load()
    const t = setInterval(load, 20000)
    return () => { alive = false; clearInterval(t) }
  }, [revealed, marketId])

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

      {/* Live encrypted-pool meter — present only while still hidden */}
      {!revealed && (
        <div className="mt-5 rounded-xl border border-hairline bg-canvas-soft px-4 py-3.5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 eyebrow text-mute">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff7a17] opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ff7a17]" />
              </span>
              Encrypted pool · live
            </div>
            <div className="eyebrow text-mute">
              {betCount === null ? '—' : (
                <motion.span key={betCount} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-ink">
                  {betCount} bet{betCount === 1 ? '' : 's'}
                </motion.span>
              )}
            </div>
          </div>
          {/* Scrambling hex — a faithful stand-in for the euint64 pool the chain holds */}
          <div className="font-mono text-[15px] text-breeze/80 truncate" aria-hidden>
            <Ciphertext length={28} speed={130} />
          </div>
          <p className="mt-2 text-[11px] text-mute">
            Total grows with every bet — value stays ciphertext until resolution.
          </p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-hairline flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow text-mute">Total pool</div>
          <div className={`mt-0.5 ${revealed ? 'text-ink font-mono text-xl' : 'text-body text-base'}`}>
            {revealed ? `${market.totalPool.toString()} CST` : 'Hidden by FHE 🔐'}
          </div>
        </div>
        <div className="eyebrow text-mute text-right max-w-[50%]">
          Split revealed only after resolution
        </div>
      </div>
    </div>
  )
}
