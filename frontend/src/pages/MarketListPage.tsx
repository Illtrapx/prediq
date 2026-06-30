import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getPMReadContract } from '../lib/contract'
import type { MarketStruct } from '../lib/contract'
import { MarketCard, MarketCardSkeleton } from '../components/MarketCard'
import { EncryptionVisualizer } from '../components/EncryptionVisualizer'
import { HeroEncryptDemo } from '../components/HeroEncryptDemo'
import { HowItWorks } from '../components/HowItWorks'
import { PageMotion } from '../components/PageMotion'
import { staggerContainer } from '../lib/animations'
import { getMarketCategories, CATEGORIES, type Category } from '../lib/supabase'

const TABS = ['All', ...CATEGORIES] as const
type Tab = (typeof TABS)[number]

export function MarketListPage() {
  const [markets, setMarkets] = useState<{ id: number; market: MarketStruct }[]>([])
  const [cats, setCats] = useState<Record<number, Category>>({})
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const heroRef = useRef<HTMLElement>(null)

  // Selected tab is driven by the ?category= URL param so filtered views are shareable.
  const param = (searchParams.get('category') ?? '').toLowerCase()
  const activeTab: Tab = (TABS.find(t => t.toLowerCase() === param) ?? 'All') as Tab

  function selectTab(t: Tab) {
    if (t === 'All') setSearchParams({}, { replace: false })
    else setSearchParams({ category: t.toLowerCase() }, { replace: false })
  }

  const visible = useMemo(
    () =>
      activeTab === 'All'
        ? markets
        : markets.filter(({ id }) => (cats[id] ?? 'Other') === activeTab),
    [markets, cats, activeTab],
  )

  function onHeroMove(e: React.MouseEvent<HTMLElement>) {
    const el = heroRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  useEffect(() => {
    const contract = getPMReadContract()
    contract
      .marketCount()
      .then(async (n: bigint) => {
        const count = Number(n)
        if (count === 0) {
          setMarkets([])
          setLoading(false)
          return
        }
        const all = await Promise.all(
          Array.from({ length: count }, (_, i) =>
            contract.getMarket(i).then((m: MarketStruct) => ({ id: i, market: m })),
          ),
        )
        setMarkets(all.reverse())
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    getMarketCategories()
      .then(setCats)
      .catch(() => setCats({}))
  }, [])

  return (
    <PageMotion className="max-w-5xl mx-auto px-6">
      {/* Hero — pointer-follow glow */}
      <header
        ref={heroRef}
        onMouseMove={onHeroMove}
        className="hero-glow relative pt-20 pb-16 grid lg:grid-cols-2 gap-12 lg:gap-10 items-center"
      >
        <div>
          <div className="flex items-center gap-2 eyebrow mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a17] animate-pulse" />
            Powered by FHE · live on Sepolia
          </div>
          <h1 className="display text-5xl sm:text-7xl">
            Bet without
            <br />
            revealing your hand
          </h1>
          <p className="text-body text-lg mt-7 max-w-xl leading-relaxed">
            A prediction market where your stake amount and the side you picked stay fully encrypted
            on-chain — until the market resolves. No whale-watching, no copy-trading, no
            front-running.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-9">
            <Link to="/create" className="pill pill-primary">
              Create a market
            </Link>
            <a href="#markets" className="pill pill-outline">
              Browse markets
            </a>
          </div>
          <div className="mt-8">
            <EncryptionVisualizer variant="compact" />
          </div>
        </div>

        {/* Interactive right panel — fills the empty half */}
        <HeroEncryptDemo className="lg:ml-auto w-full max-w-md" />
      </header>

      <div className="border-t border-hairline" />

      {/* How it works — interactive on hover (homepage only) */}
      <HowItWorks />

      <div className="border-t border-hairline" />

      {/* Markets */}
      <section id="markets" className="py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="eyebrow mb-2">Markets</div>
            <h2 className="display text-3xl">Active markets</h2>
          </div>
          <Link to="/create" className="pill pill-outline">
            New market
          </Link>
        </div>

        {/* Category filter tabs — selection persisted in ?category= */}
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2 mb-8">
          {TABS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => selectTab(t)}
              aria-pressed={activeTab === t}
              className={`pill px-4 py-1.5 text-[13px] ${activeTab === t ? 'pill-primary' : 'pill-outline'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && markets.length === 0 && (
          <div className="text-center py-20 card border-dashed">
            <p className="text-mute">No markets yet.</p>
            <Link to="/create" className="text-ink hover:underline text-sm mt-3 inline-block">
              Create the first one →
            </Link>
          </div>
        )}

        {!loading && markets.length > 0 && visible.length === 0 && (
          <div className="text-center py-20 card border-dashed">
            <p className="text-mute">No {activeTab} markets yet.</p>
            <button
              type="button"
              onClick={() => selectTab('All')}
              className="text-ink hover:underline text-sm mt-3 inline-block"
            >
              See all markets →
            </button>
          </div>
        )}

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {visible.map(({ id, market }) => (
            <MarketCard key={id} id={id} market={market} />
          ))}
        </motion.div>
      </section>
    </PageMotion>
  )
}
