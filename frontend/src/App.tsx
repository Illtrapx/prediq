import { lazy, Suspense, useRef } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useWallet } from './hooks/useWallet'
import { useNavScroll } from './hooks/useNavScroll'
import { WalletButton } from './components/WalletButton'
import { CstBalance } from './components/CstBalance'
import { ToastProvider } from './components/Toast'
import { Logo } from './components/Logo'
import { NavItem } from './components/NavItem'
import { MarketListPage } from './pages/MarketListPage'

// Landing (MarketListPage) ships in the main bundle; secondary routes are
// code-split so their JS (and ethers usage) loads only when navigated to.
const CreateMarketPage = lazy(() =>
  import('./pages/CreateMarketPage').then(m => ({ default: m.CreateMarketPage })),
)
const MarketDetailPage = lazy(() =>
  import('./pages/MarketDetailPage').then(m => ({ default: m.MarketDetailPage })),
)
const MyBetsPage = lazy(() => import('./pages/MyBetsPage').then(m => ({ default: m.MyBetsPage })))
const LeaderboardPage = lazy(() =>
  import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })),
)
const HowItWorksPage = lazy(() =>
  import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })),
)

function App() {
  const wallet = useWallet()
  const navRef = useRef<HTMLElement>(null)
  useNavScroll(navRef)

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="min-h-screen bg-canvas text-body">
          <nav ref={navRef} aria-label="Main navigation" className="nav-shell">
            <div className="nav-inner">
              <Link to="/" aria-label="Prediq — home" className="shrink-0">
                <Logo />
              </Link>

              <div className="nav-cluster hidden sm:flex">
                <NavItem to="/how-it-works">How it works</NavItem>
                <NavItem to="/leaderboard">Leaderboard</NavItem>
                {wallet.authenticated && <NavItem to="/my-bets">My bets</NavItem>}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {wallet.authenticated && (
                  <CstBalance address={wallet.address} signer={wallet.signer} />
                )}
                <WalletButton wallet={wallet} />
              </div>
            </div>
          </nav>
          {/* Fixed navbar lifts out of flow — spacer preserves the 80px slot */}
          <div aria-hidden="true" className="nav-spacer" />

          <main>
          <Suspense
            fallback={
              <div role="status" className="max-w-5xl mx-auto px-6 pt-20 eyebrow text-mute">Loading…</div>
            }
          >
            <Routes>
              <Route path="/" element={<MarketListPage />} />
              <Route
                path="/create"
                element={<CreateMarketPage signer={wallet.signer} address={wallet.address} />}
              />
              <Route
                path="/market/:id"
                element={<MarketDetailPage signer={wallet.signer} address={wallet.address} />}
              />
              <Route path="/my-bets" element={<MyBetsPage address={wallet.address} />} />
              <Route path="/leaderboard" element={<LeaderboardPage address={wallet.address} />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
            </Routes>
          </Suspense>
          </main>

          <footer className="mt-24 border-t border-hairline">
            <div className="max-w-5xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
              <div className="max-w-xs">
                <Logo />
                <p className="text-mute text-sm mt-3 leading-relaxed">
                  The institutional bridge for high-fidelity encrypted prediction markets.
                  Empowering data-driven decision making with FHE confidentiality.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="eyebrow text-mute/60">Platform</div>
                <Link
                  to="/"
                  className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit"
                >
                  Markets
                </Link>
                <Link
                  to="/my-bets"
                  className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit"
                >
                  Dashboard
                </Link>
                <Link
                  to="/create"
                  className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit"
                >
                  Create Market
                </Link>
                <Link
                  to="/how-it-works"
                  className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit"
                >
                  How it works
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                <div className="eyebrow text-mute/60">Technology</div>
                <a
                  href="https://zama.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit"
                >
                  Zama Protocol
                </a>
                <a
                  href="https://docs.zama.ai/protocol"
                  target="_blank"
                  rel="noreferrer"
                  className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit"
                >
                  FHE Docs
                </a>
              </div>
            </div>

            <div className="border-t border-hairline">
              <div className="max-w-5xl mx-auto px-6 py-6 eyebrow text-mute/50 text-[10px]">
                Prediq Encrypted Prediction Markets. Powered by Zama FHE.
              </div>
            </div>
          </footer>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
