import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { MarketStruct } from '../lib/contract'
import { getMarketStatus } from '../lib/market'
import { Ciphertext } from './Ciphertext'
import { PoolStat } from './PoolStat'
import { MarketCountdown } from './MarketCountdown'
import { fadeUp, softSpring } from '../lib/animations'

const MotionLink = motion.create(Link)

type Props = { id: number; market: MarketStruct }

export function MarketCardSkeleton() {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
      <div className="skeleton h-5 w-5/6 rounded" />
      <div className="skeleton h-14 w-full rounded-lg" />
      <div className="skeleton h-3 w-32 rounded" />
      <div className="flex items-center justify-between mt-1">
        <div className="skeleton h-6 w-24 rounded-full" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </div>
  )
}

export function MarketCard({ id, market }: Props) {
  const status = getMarketStatus(market)
  const open = status.label === 'OPEN'

  let yesPct = 50
  if (market.finalized && market.totalPool > 0n) {
    const win = market.winningPool
    const lose = market.totalPool > win ? market.totalPool - win : 0n
    const yes = market.winningSide ? win : lose
    yesPct = Math.round((Number(yes) / Number(market.totalPool)) * 100)
  }

  return (
    <MotionLink
      to={`/market/${id}`}
      variants={fadeUp}
      whileHover={{ y: -4, boxShadow: '0 14px 34px rgba(0, 0, 0, 0.45)' }}
      transition={softSpring}
      className="group flex flex-col card p-5 hover:border-white/25 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
          {status.label}
        </span>
        <MarketCountdown market={market} />
      </div>

      <p className="text-ink text-[17px] leading-snug line-clamp-2 mb-5">{market.question}</p>

      {market.finalized ? (
        <div className="mb-5">
          <div className="h-2 w-full rounded-full overflow-hidden flex bg-canvas-mid">
            <div className="bg-ink h-full" style={{ width: `${yesPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 eyebrow">
            <span>YES {yesPct}%</span>
            <span className="text-ink">{market.winningSide ? 'YES' : 'NO'} WON</span>
            <span>NO {100 - yesPct}%</span>
          </div>
        </div>
      ) : (
        <div className="mb-5 py-3 rounded-lg border border-dashed border-hairline text-center overflow-hidden">
          <Ciphertext
            length={18}
            className="text-[12px] text-mute/70 group-hover:text-[#ff7a17]/70 transition-colors"
          />
          <div className="eyebrow text-body mt-1.5">Odds encrypted</div>
          <div className="text-mute text-[11px] mt-0.5">
            hidden until resolution · no front-running
          </div>
        </div>
      )}

      <div className="mb-3">
        <PoolStat market={market} variant="card" />
      </div>

      <div className="mt-auto flex items-center justify-between">
        {open ? (
          <div className="flex gap-2">
            <span className="pill pill-outline pointer-events-none px-3 py-1 text-[12px]">YES</span>
            <span className="pill pill-outline pointer-events-none px-3 py-1 text-[12px]">NO</span>
          </div>
        ) : (
          <span />
        )}
        <span className="eyebrow text-mute group-hover:text-ink transition-colors">
          {open ? 'Place bet →' : 'View market →'}
        </span>
      </div>
    </MotionLink>
  )
}
