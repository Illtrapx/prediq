import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { EventLog } from 'ethers'
import { getPMReadContract } from '../lib/contract'
import { PageMotion } from '../components/PageMotion'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { staggerContainer, fadeUp } from '../lib/animations'
import { DEMO_TRADES, demoLeaderboardRows } from '../lib/demo'
import { CipherChip } from '../components/CipherChip'

type Row = { wallet: string; bets: number; correct: number; winRate: number }

function truncate(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function LeaderboardPage({ address }: { address: string | null }) {
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    let alive = true
    // Showcase seeding: synthetic personas fill out the board for the demo, and
    // stand in when the on-chain query fails (RPC hiccup, rate limit, local dev).
    const demo: Row[] = DEMO_TRADES ? demoLeaderboardRows() : []
    const rank = (list: Row[]) =>
      list.filter(r => r.bets >= 1).sort((a, b) => b.winRate - a.winRate || b.correct - a.correct)
    ;(async () => {
      try {
        const c = getPMReadContract()
        const [betLogs, claimLogs] = await Promise.all([
          c.queryFilter(c.filters.BetPlaced()) as Promise<EventLog[]>,
          c.queryFilter(c.filters.Claimed()) as Promise<EventLog[]>,
        ])

        const bets = new Map<string, number>()
        for (const l of betLogs) {
          const bettor = l.args?.bettor
          const w = typeof bettor === 'string' ? bettor.toLowerCase() : null
          if (w) bets.set(w, (bets.get(w) ?? 0) + 1)
        }
        const correct = new Map<string, number>()
        for (const l of claimLogs) {
          const bettor = l.args?.bettor
          const w = typeof bettor === 'string' ? bettor.toLowerCase() : null
          if (w) correct.set(w, (correct.get(w) ?? 0) + 1)
        }

        const real: Row[] = [...bets.entries()].map(([wallet, b]) => {
          const cor = correct.get(wallet) ?? 0
          return { wallet, bets: b, correct: cor, winRate: b > 0 ? (cor / b) * 100 : 0 }
        })

        if (alive) setRows(rank([...real, ...demo]))
      } catch {
        if (alive) setRows(rank(demo))
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const me = address?.toLowerCase() ?? null

  return (
    <PageMotion className="max-w-3xl mx-auto px-6 pt-12 pb-20">
      <Link to="/" className="eyebrow hover:text-ink transition-colors mb-8 inline-block">
        ← Markets
      </Link>
      <div className="eyebrow mb-3">Rankings</div>
      <h1 className="display text-4xl mb-3">Leaderboard</h1>
      <p className="text-body mb-9">
        Ranked by win rate across resolved markets. Bet amounts and sides stay encrypted — only
        on-chain activity (bets placed, payouts claimed) is counted.
      </p>

      {rows === null && (
        <div className="flex items-center gap-2 text-mute text-sm py-12 justify-center">
          <span className="spin inline-block w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full" />
          Loading leaderboard…
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <div className="text-center py-20 card border-dashed">
          <p className="text-mute">No claims yet — be the first to win a market.</p>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_72px_72px_88px] gap-2 px-5 py-3 border-b border-hairline eyebrow text-mute">
            <span>#</span>
            <span>Wallet</span>
            <span className="text-right">Correct</span>
            <span className="text-right">Bets</span>
            <span className="text-right">Win&nbsp;rate</span>
          </div>
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {rows.map((r, i) => {
              const mine = me === r.wallet
              return (
                <motion.div
                  key={r.wallet}
                  variants={fadeUp}
                  className={`grid grid-cols-[40px_1fr_72px_72px_88px] gap-2 px-5 py-3 border-b border-hairline last:border-0 text-sm ${mine ? 'bg-white/[0.04]' : ''}`}
                >
                  <span className="text-mute font-mono">{i + 1}</span>
                  <span className="font-mono text-body flex flex-col gap-0.5 min-w-0">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{truncate(r.wallet)}</span>
                      {mine && (
                        <motion.span
                          className="eyebrow text-[10px] text-[#ff7a17] shrink-0"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
                        >
                          You
                        </motion.span>
                      )}
                    </span>
                    <CipherChip seed={r.wallet} />
                  </span>
                  <span className="text-right text-ink font-mono">{r.correct}</span>
                  <span className="text-right text-mute font-mono">{r.bets}</span>
                  <AnimatedNumber
                    value={r.winRate}
                    suffix="%"
                    className="text-right text-ink font-mono"
                  />
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      )}
    </PageMotion>
  )
}
