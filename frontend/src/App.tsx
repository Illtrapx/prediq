import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useWallet } from './hooks/useWallet'
import { WalletButton } from './components/WalletButton'
import { CstBalance } from './components/CstBalance'
import { ToastProvider } from './components/Toast'
import { MarketListPage } from './pages/MarketListPage'

// Landing (MarketListPage) ships in the main bundle; secondary routes are
// code-split so their JS (and ethers usage) loads only when navigated to.
const CreateMarketPage = lazy(() => import('./pages/CreateMarketPage').then(m => ({ default: m.CreateMarketPage })))
const MarketDetailPage = lazy(() => import('./pages/MarketDetailPage').then(m => ({ default: m.MarketDetailPage })))
const MyBetsPage = lazy(() => import('./pages/MyBetsPage').then(m => ({ default: m.MyBetsPage })))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })))
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })))

function App() {
  const wallet = useWallet()

  return (
    <BrowserRouter>
      <ToastProvider>
      <div className="min-h-screen bg-canvas text-body">
        <nav className="glass-header sticky top-0 z-20 px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <span className="display text-ink text-2xl tracking-tight group-hover:opacity-80 transition-opacity">Prediq</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/how-it-works" className="nav-underline eyebrow text-mute hover:text-ink transition-colors hidden sm:block">
              How it works
            </Link>
            <Link to="/leaderboard" className="nav-underline eyebrow text-mute hover:text-ink transition-colors hidden sm:block">
              Leaderboard
            </Link>
            {wallet.authenticated && (
              <Link to="/my-bets" className="nav-underline eyebrow text-mute hover:text-ink transition-colors hidden sm:block">
                My bets
              </Link>
            )}
            {wallet.authenticated && (
              <CstBalance address={wallet.address} signer={wallet.signer} />
            )}
            <WalletButton wallet={wallet} />
          </div>
        </nav>

        <Suspense fallback={<div className="max-w-5xl mx-auto px-6 pt-20 eyebrow text-mute">Loading…</div>}>
          <Routes>
            <Route path="/" element={<MarketListPage />} />
            <Route path="/create" element={<CreateMarketPage signer={wallet.signer} address={wallet.address} />} />
            <Route path="/market/:id" element={
              <MarketDetailPage signer={wallet.signer} address={wallet.address} />
            } />
            <Route path="/my-bets" element={<MyBetsPage address={wallet.address} />} />
            <Route path="/leaderboard" element={<LeaderboardPage address={wallet.address} />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
          </Routes>
        </Suspense>

        <footer className="mt-24 border-t border-hairline">
          <div className="max-w-5xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
            <div className="max-w-xs">
              <span className="display text-ink text-2xl tracking-tight">Prediq</span>
              <p className="text-mute text-sm mt-3 leading-relaxed">
                The institutional bridge for high-fidelity encrypted prediction markets.
                Empowering data-driven decision making with FHE confidentiality.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="eyebrow text-mute/60">Platform</div>
              <Link to="/" className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit">Markets</Link>
              <Link to="/my-bets" className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit">Dashboard</Link>
              <Link to="/create" className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit">Create Market</Link>
              <Link to="/how-it-works" className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit">How it works</Link>
            </div>

            <div className="flex flex-col gap-3">
              <div className="eyebrow text-mute/60">Technology</div>
              <a href="https://zama.ai" target="_blank" rel="noreferrer" className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit">Zama Protocol</a>
              <a href="https://docs.zama.ai/protocol" target="_blank" rel="noreferrer" className="nav-underline text-sm text-mute hover:text-ink transition-colors w-fit">FHE Docs</a>
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
