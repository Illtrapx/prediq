import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getPMReadContract } from '../lib/contract'
import type { MarketStruct } from '../lib/contract'
import { getMarketStatus } from '../lib/market'
import { PageMotion } from '../components/PageMotion'
import { getMyBets } from '../lib/mybets'
import type { MyBet } from '../lib/mybets'
import { ShareCard } from '../components/ShareCard'
import { useShareCard } from '../hooks/useShareCard'

type Props = { address: string | null }

type Row = MyBet & { market?: MarketStruct }

// ── Inline share button per bet row ──────────────────────────────────────────
function ShareBetButton({ row, address }: { row: Row; address: string }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { capturing, shareToX } = useShareCard(cardRef, {
    marketQuestion: row.market?.question ?? `Market #${row.marketId}`,
    side: row.side,
    txHash: row.txHash ?? null,
  })
  const deadline = row.market ? Number(row.market.resolveDeadline) * 1000 : 0

  return (
    <>
      {/* Off-screen card for capture */}
      <ShareCard
        ref={cardRef}
        marketQuestion={row.market?.question ?? `Market #${row.marketId}`}
        side={row.side}
        placedAt={row.ts}
        deadline={deadline}
        walletAddress={address}
      />
      <button
        onClick={e => {
          e.preventDefault()
          void shareToX()
        }}
        disabled={capturing}
        className="pill pill-outline px-3 py-1.5 text-[11px] shrink-0"
        title="Share prediction on X"
      >
        {capturing ? (
          <span className="spin inline-block w-3 h-3 border-2 border-current/40 border-t-transparent rounded-full" />
        ) : (
          '𝕏'
        )}
      </button>
    </>
  )
}

export function MyBetsPage({ address }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Data-loading effect: reads localStorage bets + on-chain market state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!address) {
      setRows([])
      setLoading(false)
      return
    }
    const bets = getMyBets(address).sort((a, b) => b.ts - a.ts)
    if (bets.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    const contract = getPMReadContract()
    const ids = [...new Set(bets.map(b => b.marketId))]
    Promise.all(
      ids.map(id =>
        contract
          .getMarket(id)
          .then((m: MarketStruct) => [id, m] as const)
          .catch(() => [id, undefined] as const),
      ),
    )
      .then(pairs => {
        const map = new Map(pairs)
        setRows(bets.map(b => ({ ...b, market: map.get(b.marketId) })))
      })
      .finally(() => setLoading(false))
  }, [address])

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <PageMotion className="max-w-3xl mx-auto px-6 pt-12 pb-20">
      <Link to="/" className="eyebrow hover:text-ink transition-colors mb-8 inline-block">
        ← Markets
      </Link>
      <div className="eyebrow mb-3">Your activity</div>
      <h1 className="display text-4xl mb-3">My bets</h1>
      <p className="text-body mb-9">
        Your stake amount and side are visible only here, on the device that placed the bet.
        On-chain they stay encrypted until the market resolves.
      </p>

      {!address && (
        <div className="text-center py-16 card border-dashed fade-up">
          <p className="text-ink mb-2">Connect your wallet</p>
          <p className="text-mute text-sm">Sign in to see the bets you've placed.</p>
        </div>
      )}

      {address && loading && (
        <div className="flex items-center justify-center gap-2 text-mute text-sm py-12">
          <span aria-hidden="true" className="spin inline-block w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full" />
          Loading your bets…
        </div>
      )}

      {address && !loading && rows.length === 0 && (
        <div className="text-center py-20 card border-dashed">
          <p className="text-mute">No bets yet.</p>
          <Link to="/" className="text-ink hover:underline text-sm mt-3 inline-block">
            Browse markets →
          </Link>
        </div>
      )}

      {address && rows.length > 0 && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-hairline border border-hairline rounded-lg overflow-hidden mb-6">
            <div className="bg-canvas-card p-5">
              <div className="eyebrow text-mute">Total bets</div>
              <div className="display text-2xl mt-1">{rows.length}</div>
            </div>
            <div className="bg-canvas-card p-5">
              <div className="eyebrow text-mute">Total staked</div>
              <div className="display text-2xl mt-1">{total}</div>
            </div>
            <div className="bg-canvas-card p-5 col-span-2 sm:col-span-1">
              <div className="eyebrow text-mute">Markets</div>
              <div className="display text-2xl mt-1">{new Set(rows.map(r => r.marketId)).size}</div>
            </div>
          </div>

          {/* Bet rows */}
          <div className="flex flex-col gap-3">
            {rows.map(r => {
              const st = getMarketStatus(r.market)
              return (
                <Link
                  key={`${r.marketId}-${r.ts}`}
                  to={`/market/${r.marketId}`}
                  className="card p-5 flex items-center gap-4 hover:border-white/25 transition-colors fade-up"
                >
                  <div
                    className={`pill ${r.side ? 'pill-primary' : 'pill-outline'} pointer-events-none px-4 py-2 text-[13px]`}
                  >
                    {r.side ? 'YES' : 'NO'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-[15px] leading-snug line-clamp-1">
                      {r.market?.question ?? `Market #${r.marketId}`}
                    </p>
                    <div className="eyebrow mt-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                      {st.label}
                      <span className="text-mute">· {new Date(r.ts).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="eyebrow text-mute">Stake</div>
                      <div className="text-ink font-mono text-lg">{r.amount}</div>
                    </div>
                    <ShareBetButton row={r} address={address} />
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </PageMotion>
  )
}
