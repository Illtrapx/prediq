import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { JsonRpcSigner } from 'ethers'
import { getPMContract } from '../lib/contract'
import { TxStatus } from '../components/TxStatus'
import { PageMotion } from '../components/PageMotion'
import { useToast } from '../components/Toast'
import { useCreatorAccess } from '../hooks/useCreatorAccess'
import { CATEGORIES, setMarketCategory, type Category } from '../lib/supabase'
import { fetchPolymarketSuggestions, type PolymarketSuggestion } from '../lib/polymarket'

type Props = { signer: JsonRpcSigner | null; address: string | null }

// ── Access-request form ────────────────────────────────────────────────────────
function AccessRequest({ address }: { address: string }) {
  const { apply } = useCreatorAccess(address)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setStatus('pending')
      await apply({ name, email, reason })
      // useCreatorAccess flips to 'pending' → parent re-renders the pending state
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 card p-6 fade-up">
      <div>
        <label className="eyebrow block mb-2">Name</label>
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" className="input-xai" />
      </div>
      <div>
        <label className="eyebrow block mb-2">Email</label>
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" className="input-xai" />
      </div>
      <div>
        <label className="eyebrow block mb-2">Why do you want to create markets?</label>
        <textarea required value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder="Tell us what kind of markets you'd run."
          className="input-xai resize-none" />
      </div>
      <div className="eyebrow text-mute">Wallet · {address.slice(0, 6)}…{address.slice(-4)}</div>
      <button type="submit" disabled={status === 'pending'} className="pill pill-primary w-full">
        {status === 'pending' && <span className="spin inline-block w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full" />}
        {status === 'pending' ? 'Submitting…' : 'Request access'}
      </button>
      <TxStatus status={status === 'error' ? 'error' : 'idle'} message={errMsg} />
    </form>
  )
}

// ── Polymarket trending suggestions ───────────────────────────────────────────
function PolymarketSuggestions({ onSelect }: { onSelect: (s: PolymarketSuggestion) => void }) {
  const [suggestions, setSuggestions] = useState<PolymarketSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolymarketSuggestions()
      .then(setSuggestions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center gap-2 text-mute text-xs mb-4">
      <span className="spin inline-block w-3 h-3 border border-white/40 border-t-transparent rounded-full" />
      Loading trending markets…
    </div>
  )

  if (!suggestions.length) return null

  return (
    <div className="mb-5">
      <p className="eyebrow mb-3 text-mute">Trending on Polymarket — click to use</p>
      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(s)}
            className="text-left text-[13px] text-mute hover:text-ink border border-[#212327] hover:border-[#333] rounded px-3 py-2 transition-colors leading-snug"
          >
            {s.question}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Create-market form (approved users only) ───────────────────────────────────
function CreateForm({ signer }: { signer: JsonRpcSigner | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [question, setQuestion] = useState('')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState<Category>('Other')
  const [resolutionSource, setResolutionSource] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!signer) { setErrMsg('Connect your wallet first.'); setStatus('error'); return }
    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000)
    if (deadlineTs <= Math.floor(Date.now() / 1000) + 60) {
      setErrMsg('Deadline must be at least 1 minute in the future')
      setStatus('error')
      return
    }
    try {
      setStatus('pending')
      const contract = getPMContract(signer)
      const tx = await contract.createMarket(question, BigInt(deadlineTs))
      await tx.wait()
      const count = await contract.marketCount()
      const newId = Number(count) - 1
      // Save category + resolution source off-chain (best-effort; market is already created on-chain).
      await setMarketCategory(newId, category, resolutionSource || undefined)
      setStatus('success')
      toast('Market created ✓', 'success')
      setTimeout(() => navigate(`/market/${newId}`), 800)
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  function applySuggestion(s: PolymarketSuggestion) {
    setQuestion(s.question)
    setCategory(s.category)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 card p-6 fade-up">
      <PolymarketSuggestions onSelect={applySuggestion} />
      <div>
        <label className="eyebrow block mb-2">Question</label>
        <input required value={question} onChange={e => setQuestion(e.target.value)}
          placeholder="Will ETH hit $4000 by July 7?" className="input-xai" />
        <p className="text-mute text-[12px] mt-2">Phrase it so the answer is a clear YES or NO.</p>
      </div>
      <div>
        <label className="eyebrow block mb-2">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as Category)}
          className="input-xai [color-scheme:dark]"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="eyebrow block mb-2">Resolution source (optional)</label>
        <input
          type="url"
          value={resolutionSource}
          onChange={e => setResolutionSource(e.target.value)}
          placeholder="https://x.com/... or https://coinmarketcap.com/..."
          className="input-xai"
        />
        <p className="text-mute text-[12px] mt-2">Shown to bettors after resolution — helps them verify the outcome.</p>
      </div>
      <div>
        <label className="eyebrow block mb-2">Resolve deadline</label>
        <input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
          className="input-xai [color-scheme:dark]" />
        <p className="text-mute text-[12px] mt-2">Betting closes at this time. You can resolve afterward.</p>
      </div>
      <button type="submit" disabled={status === 'pending'} className="pill pill-primary w-full">
        {status === 'pending' && <span className="spin inline-block w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full" />}
        {status === 'pending' ? 'Creating…' : 'Create market'}
      </button>
      <TxStatus status={status} message={status === 'error' ? errMsg : status === 'success' ? 'Created! Redirecting…' : undefined} />
    </form>
  )
}

// ── Status notice card ─────────────────────────────────────────────────────────
function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6 fade-up">
      <h2 className="text-ink text-lg mb-2">{title}</h2>
      <p className="text-mute text-sm leading-relaxed">{body}</p>
    </div>
  )
}

export function CreateMarketPage({ signer, address }: Props) {
  const { status } = useCreatorAccess(address)

  let heading = 'Request creator access'
  let sub = 'Market creation is gated. Fill out the form and an admin will review your request.'
  if (status === 'approved') { heading = 'Create a market'; sub = 'You are an approved creator. You become the resolver — you declare the outcome after the deadline.' }
  if (status === 'pending') { heading = 'Application under review'; sub = 'Your creator request was submitted.' }
  if (status === 'rejected') { heading = 'Application declined'; sub = 'Your creator request was not approved.' }

  return (
    <PageMotion className="max-w-lg mx-auto px-6 pt-12 pb-20">
      <Link to="/" className="eyebrow hover:text-ink transition-colors mb-8 inline-block">← Markets</Link>
      <div className="eyebrow mb-3">{status === 'approved' ? 'New market' : 'Creator access'}</div>
      <h1 className="display text-4xl mb-3">{heading}</h1>
      <p className="text-body mb-9">{sub}</p>

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-mute text-sm py-8">
          <span className="spin inline-block w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full" />
          Checking access…
        </div>
      )}
      {status === 'disconnected' && (
        <Notice title="Connect your wallet" body="Sign in with your wallet to request creator access or create a market." />
      )}
      {status === 'none' && address && <AccessRequest address={address} />}
      {status === 'pending' && (
        <Notice title="Pending review" body="We'll grant access once an admin approves your request. Check back soon." />
      )}
      {status === 'rejected' && (
        <Notice title="Not approved" body="Your request to create markets was declined. Reach out if you think this is a mistake." />
      )}
      {status === 'approved' && <CreateForm signer={signer} />}
    </PageMotion>
  )
}
