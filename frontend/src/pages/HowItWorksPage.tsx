import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageMotion } from '../components/PageMotion'
import { Ciphertext } from '../components/Ciphertext'

const STEPS = [
  {
    n: '01',
    title: 'Connect & Fund',
    body: 'Connect MetaMask on Sepolia. Mint CST (Confidential Stake Tokens) — the encrypted ERC-20 used for all bets on Prediq.',
    tag: 'Wallet',
  },
  {
    n: '02',
    title: 'Place an Encrypted Bet',
    body: 'Pick YES or NO on any open market. Your stake amount and side are encrypted on-chain via Zama FHE — the contract sees ciphertext, not numbers.',
    tag: 'Bet',
  },
  {
    n: '03',
    title: 'Market Closes',
    body: 'When the deadline hits, betting stops. The resolver (market creator) declares the winning outcome on-chain.',
    tag: 'Resolve',
  },
  {
    n: '04',
    title: 'Claim Your Payout',
    body: 'After finalization the pools are publicly decrypted. Payout is computed on your encrypted stake — only you can decrypt the result via EIP-712 signature.',
    tag: 'Claim',
  },
]

// ── Privacy comparison toggle ──────────────────────────────────────────────────
function PrivacyDemo() {
  const [mode, setMode] = useState<'traditional' | 'prediq'>('traditional')

  return (
    <div className="card p-6 md:p-8">
      <div className="flex gap-2 mb-8">
        <button
          type="button"
          onClick={() => setMode('traditional')}
          className={`pill text-xs px-4 py-1.5 transition-all ${mode === 'traditional' ? 'pill-primary' : 'pill-outline'}`}
        >
          Traditional Market
        </button>
        <button
          type="button"
          onClick={() => setMode('prediq')}
          className={`pill text-xs px-4 py-1.5 transition-all ${mode === 'prediq' ? 'pill-primary' : 'pill-outline'}`}
        >
          Prediq (FHE)
        </button>
      </div>

      <div className="eyebrow text-mute mb-5">Will ETH hit $4,000 by July 7?</div>

      {mode === 'traditional' ? (
        <div className="space-y-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-green-400 font-mono">YES · 65%</span>
            <span className="text-red-400 font-mono">NO · 35%</span>
          </div>
          <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: '65%' }} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
            <div className="rounded border border-green-900/40 bg-[#0d1a0d] p-4">
              <div className="eyebrow text-[10px] text-mute mb-1.5">YES pool</div>
              <div className="font-mono text-green-400 text-lg">6,500 USDC</div>
            </div>
            <div className="rounded border border-red-900/40 bg-[#1a0d0d] p-4">
              <div className="eyebrow text-[10px] text-mute mb-1.5">NO pool</div>
              <div className="font-mono text-red-400 text-lg">3,500 USDC</div>
            </div>
          </div>
          <p className="text-[12px] text-[#ff7a17] pt-1">
            ⚠ Live odds visible to everyone — whales front-run, copy-traders follow.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-mute font-mono">YES · ???</span>
            <span className="text-mute font-mono">NO · ???</span>
          </div>
          <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
            <div className="h-full bg-white/5 rounded-full w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
            <div className="card p-4">
              <div className="eyebrow text-[10px] text-mute mb-1.5">YES pool</div>
              <Ciphertext length={12} className="text-mute text-base" />
            </div>
            <div className="card p-4">
              <div className="eyebrow text-[10px] text-mute mb-1.5">NO pool</div>
              <Ciphertext length={12} className="text-mute text-base" />
            </div>
          </div>
          <p className="text-[12px] text-mute pt-1">
            Encrypted until the market closes. Bet on conviction, not crowd movement.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Payout calculator ──────────────────────────────────────────────────────────
function PayoutCalc() {
  const [stake, setStake] = useState(100)
  const [poolPct, setPoolPct] = useState(40)

  const totalPool = 1000
  const winningPool = Math.round((totalPool * poolPct) / 100)
  const payout = Math.round((stake * totalPool) / winningPool)
  const profit = payout - stake
  const multiplier = (payout / stake).toFixed(2)

  return (
    <div className="card p-6 md:p-8 space-y-6">
      <div>
        <div className="flex justify-between mb-3">
          <label className="eyebrow text-mute">Your stake</label>
          <span className="font-mono text-ink text-sm">{stake} CST</span>
        </div>
        <input
          type="range" min={10} max={500} step={10}
          value={stake} onChange={e => setStake(Number(e.target.value))}
          className="w-full accent-[#ff7a17] cursor-pointer"
        />
      </div>

      <div>
        <div className="flex justify-between mb-3">
          <label className="eyebrow text-mute">Your side's pool share</label>
          <span className="font-mono text-ink text-sm">{poolPct}%</span>
        </div>
        <input
          type="range" min={10} max={90} step={5}
          value={poolPct} onChange={e => setPoolPct(Number(e.target.value))}
          className="w-full accent-[#ff7a17] cursor-pointer"
        />
        <p className="text-[11px] text-mute mt-2">
          {poolPct}% of total pool on your side · {100 - poolPct}% against you
        </p>
      </div>

      <div className="border-t border-hairline pt-5">
        <div className="font-mono text-[12px] text-mute leading-relaxed mb-5 bg-[#0d0d0d] rounded p-3 border border-hairline">
          <span className="text-mute/50">{'// payout formula'}</span><br />
          payout = stake × totalPool / winningPool<br />
          {'       '}= {stake} × {totalPool} / {winningPool}<br />
          {'       '}= <span className="text-ink font-bold">{payout} CST</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="card p-4">
            <div className="eyebrow text-[10px] text-mute mb-2">Staked</div>
            <div className="font-mono text-sm text-ink">{stake}</div>
          </div>
          <div className="card p-4">
            <div className="eyebrow text-[10px] text-mute mb-2">Profit</div>
            <div className="font-mono text-sm text-green-400">+{profit}</div>
          </div>
          <div className="card p-4">
            <div className="eyebrow text-[10px] text-mute mb-2">Multiplier</div>
            <div className="font-mono text-sm text-[#ff7a17]">{multiplier}×</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function HowItWorksPage() {
  return (
    <PageMotion className="max-w-3xl mx-auto px-6 pt-16 pb-28">
      {/* Hero */}
      <div className="mb-16">
        <div className="eyebrow text-mute mb-4">How it works</div>
        <h1 className="display text-4xl md:text-5xl mb-6 leading-[1.1]">
          Odds hidden by FHE.<br />
          Bet on what you know,<br />
          not what others do.
        </h1>
        <p className="text-body text-lg leading-relaxed max-w-xl">
          Prediq is a binary prediction market built on Zama's Fully Homomorphic Encryption protocol.
          Every stake is encrypted end-to-end — pools stay hidden until the market closes.
        </p>
      </div>

      {/* Privacy comparison */}
      <div className="mb-16">
        <div className="eyebrow text-mute mb-2">The difference</div>
        <p className="text-mute text-sm mb-5">Toggle to see how your bet looks to the outside world.</p>
        <PrivacyDemo />
      </div>

      {/* Steps */}
      <div className="mb-16">
        <div className="eyebrow text-mute mb-6">Step by step</div>
        <div className="space-y-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="card p-5 flex gap-5 hover:border-[#333] transition-all duration-200 hover:-translate-y-0.5 cursor-default"
            >
              <div className="text-[#ff7a17] font-mono text-2xl font-bold leading-none pt-0.5 select-none w-10 shrink-0">
                {s.n}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="text-ink font-medium">{s.title}</h3>
                  <span className="eyebrow text-[10px] text-mute/60 border border-hairline rounded px-1.5 py-0.5">
                    {s.tag}
                  </span>
                </div>
                <p className="text-mute text-sm leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout calculator */}
      <div className="mb-16">
        <div className="eyebrow text-mute mb-2">Payout calculator</div>
        <p className="text-mute text-sm mb-5">
          Interactive illustration — assumes 1,000 CST total pool.
        </p>
        <PayoutCalc />
      </div>

      {/* Built on */}
      <div className="mb-12">
        <div className="eyebrow text-mute mb-4">Built on</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Zama FHEVM', sub: 'FHE execution layer' },
            { label: 'Ethereum Sepolia', sub: 'Live testnet deployment' },
            { label: 'Relayer SDK', sub: 'KMS decrypt + EIP-712 proofs' },
          ].map((t) => (
            <div key={t.label} className="card p-4 text-center hover:border-[#333] transition-colors">
              <div className="text-ink text-sm font-medium mb-1">{t.label}</div>
              <div className="eyebrow text-[10px] text-mute/60">{t.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/" className="pill pill-primary">Browse markets</Link>
        <Link to="/create" className="pill pill-outline">Create a market</Link>
      </div>
    </PageMotion>
  )
}
