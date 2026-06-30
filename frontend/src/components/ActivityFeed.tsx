import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { EventLog } from 'ethers'
import { getPMReadContract, readProvider } from '../lib/contract'
import { slideInRight, staggerContainer } from '../lib/animations'
import { useVisibilityPolling } from '../hooks/useVisibilityPolling'

type Entry = { bettor: string; ts: number; txHash: string }

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function ago(ts: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function ActivityFeed({ marketId }: { marketId: number }) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  // Bumps every 15s so relative timestamps ("just now" → "1 min ago") tick
  // live without remounting the rows (keeps slide-in animations intact).
  const [, setNowTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setNowTick(n => n + 1), 15000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    try {
      const c = getPMReadContract()
      const logs = (await c.queryFilter(c.filters.BetPlaced(marketId))) as EventLog[]
      const last = logs.slice(-20).reverse()
      // Resolve block timestamps (dedup blocks to limit RPC calls).
      const blocks = [...new Set(last.map(l => l.blockNumber))]
      const tsByBlock = new Map<number, number>()
      await Promise.all(
        blocks.map(async bn => {
          const b = await readProvider.getBlock(bn)
          if (b) tsByBlock.set(bn, b.timestamp)
        }),
      )
      setEntries(
        last.map(l => ({
          bettor: (l.args?.bettor as string) ?? '0x',
          ts: tsByBlock.get(l.blockNumber) ?? Math.floor(Date.now() / 1000),
          txHash: l.transactionHash,
        })),
      )
    } catch {
      setEntries([])
    }
  }, [marketId])

  useVisibilityPolling(load, 30000)

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-ink text-lg">Activity</h2>
        <span
          className="text-mute text-xs cursor-help"
          role="note"
          aria-label="Amount and side are encrypted — only you can decrypt your own position using the Zama relayer."
          tabIndex={0}
        >
          ⓘ
        </span>
      </div>
      <p className="text-mute text-[12px] mb-5">Recent encrypted bets on this market.</p>

      {entries === null && (
        <div role="status" aria-label="Loading activity" className="flex flex-col gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-hairline" />
              <div className="h-3 bg-canvas-mid rounded flex-1 max-w-[60%]" />
              <div className="h-3 bg-canvas-mid rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {entries !== null && entries.length === 0 && (
        <p className="text-mute text-sm">No bets yet — be the first to place an encrypted bet.</p>
      )}

      {entries !== null && entries.length > 0 && (
        <motion.div
          className="flex flex-col gap-2.5"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence initial={false}>
            {entries.map((e, i) => (
              <motion.div
                key={`${e.txHash}-${i}`}
                layout
                variants={slideInRight}
                exit={{ opacity: 0, x: 30 }}
                className="flex items-center gap-3 text-[13px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a17] shrink-0" />
                <a
                  href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Encrypted bet from ${truncate(e.bettor)} — view on Etherscan`}
                  className="font-mono text-body hover:text-ink transition-colors"
                >
                  {truncate(e.bettor)}
                </a>
                <span className="text-mute">placed an encrypted bet</span>
                <span className="text-mute ml-auto shrink-0">{ago(e.ts)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
