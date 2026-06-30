import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { EventLog } from 'ethers'
import type { MarketStruct } from '../lib/contract'
import { getPMReadContract } from '../lib/contract'
import { Ciphertext } from './Ciphertext'
import { useVisibilityPolling } from '../hooks/useVisibilityPolling'

export function OddsHiddenPanel({ market, marketId }: { market: MarketStruct; marketId: number }) {
  const revealed = market.finalized

  const [betCount, setBetCount] = useState<number | null>(null)

  const loadBetCount = useCallback(async () => {
    try {
      const c = getPMReadContract()
      // Count via events — the contract has no plaintext participant counter,
      // and pool totals stay ciphertext until finalized.
      const logs = (await c.queryFilter(c.filters.BetPlaced(marketId))) as EventLog[]
      setBetCount(logs.length)
    } catch (e) {
      console.error('OddsHiddenPanel: failed to load bet count', e)
      setBetCount(prev => prev ?? 0)
    }
  }, [marketId])

  useVisibilityPolling(loadBetCount, 20000, !revealed)

  return (
    <div className="card p-6 relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.12] blur-2xl"
        style={{ background: 'radial-gradient(circle, #ff7a17, transparent 70%)' }}
      />
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h2 className="text-ink text-lg">Odds are hidden by design</h2>
      </div>
      <p className="text-body text-sm leading-relaxed">
        In traditional prediction markets, visible odds let whales front-run your bets. PredIQ hides
        the pool split using Zama FHE — you bet on what <span className="text-ink">you</span> think
        is true, not what others think.
      </p>

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
              {betCount === null ? (
                '—'
              ) : (
                <motion.span
                  key={betCount}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-ink"
                >
                  {betCount} bet{betCount === 1 ? '' : 's'}
                </motion.span>
              )}
            </div>
          </div>
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
          <div
            className={`mt-0.5 ${revealed ? 'text-ink font-mono text-xl' : 'text-body text-base'}`}
          >
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
