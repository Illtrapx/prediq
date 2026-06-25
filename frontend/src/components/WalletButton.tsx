import { Link } from 'react-router-dom'
import type { WalletState } from '../hooks/useWallet'

export function WalletButton({ wallet }: { wallet: WalletState }) {
  if (!wallet.ready) {
    return <div className="eyebrow px-3 py-1.5">Loading…</div>
  }

  if (wallet.wrongNetwork) {
    return (
      <div className="pill pill-outline" style={{ borderColor: 'rgba(255,122,23,0.6)', color: '#ff7a17', cursor: 'default' }}>
        Switch to Sepolia
      </div>
    )
  }

  if (wallet.authenticated && wallet.address) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/my-bets" title="Your bets"
          className="pill pill-outline font-mono text-[13px] flex items-center gap-2 hover:border-white/40 transition-colors">
          <span className="grid place-items-center w-5 h-5 rounded-full bg-white/10 text-ink text-[10px]">
            {wallet.address.slice(2, 4).toUpperCase()}
          </span>
          {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
        </Link>
        <button onClick={wallet.disconnect} title="Logout" aria-label="Logout"
          className="grid place-items-center w-8 h-8 rounded-full text-mute hover:text-ink hover:bg-white/5 transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <button onClick={wallet.connect} className="pill pill-primary">
      Connect Wallet
    </button>
  )
}
