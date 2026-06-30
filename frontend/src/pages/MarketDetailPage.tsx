import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ZeroHash, type JsonRpcSigner } from 'ethers'
import {
  getPMContract,
  getPMReadContract,
  getCSTContract,
  getCSTReadContract,
  readProvider,
} from '../lib/contract'
import type { MarketStruct } from '../lib/contract'
import { getFhevmInstance } from '../lib/fhevm'
import { PM_ADDRESS } from '../contracts/addresses'
import { useMarket } from '../hooks/useMarket'
import { TxStatus } from '../components/TxStatus'
import { PrivacyProofPanel } from '../components/PrivacyProofPanel'
import { ActivityFeed } from '../components/ActivityFeed'
import { OddsHiddenPanel } from '../components/OddsHiddenPanel'
import { MarketCountdown } from '../components/MarketCountdown'
import { DisputeBanner } from '../components/DisputeBanner'
import { EncryptionVisualizer } from '../components/EncryptionVisualizer'
import { PageMotion } from '../components/PageMotion'
import { AnimatedCheck } from '../components/AnimatedCheck'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { useToast } from '../components/Toast'
import { EASE, scaleIn } from '../lib/animations'
import { addMyBet, getMyBetsForMarket } from '../lib/mybets'
import type { MyBet } from '../lib/mybets'
import { getMarketResolutionSource } from '../lib/supabase'
import { signEip712 } from '../lib/eip712'
import { ShareCard } from '../components/ShareCard'
import { useShareCard } from '../hooks/useShareCard'

type TxSt = 'idle' | 'pending' | 'success' | 'error'
type Props = { signer: JsonRpcSigner | null; address: string | null }

import { VERCEL_URL } from '../lib/constants'
import { getMarketStatus } from '../lib/market'

// Build an X (Twitter) share intent. The whole tweet text is URL-encoded as a single
// param so the question can contain any characters safely. The /m/:id link unfurls
// a dynamic per-market OG card (api/m/:id → api/og).
function shareUrl(question: string, id: number): string {
  const link = `${VERCEL_URL}/m/${id}`
  const text = `I just bet on "${question}" on PredIQ — confidential predictions powered by Zama FHE 🔐 ${link} #ZamaFHE #PredIQ`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

// ── Share Card Success UI ─────────────────────────────────────────────────────
function BetShareSuccess({
  marketId,
  marketQuestion,
  side,
  placedAt,
  deadline,
  walletAddress,
  txHash,
}: {
  marketId: number
  marketQuestion: string
  side: boolean
  placedAt: number
  deadline: number
  walletAddress: string
  txHash: string | null
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { capturing, downloadCard, shareToX } = useShareCard(cardRef, {
    marketQuestion,
    side,
    txHash,
    marketId,
  })

  return (
    <>
      {/* Hidden render target for html2canvas */}
      <ShareCard
        ref={cardRef}
        marketQuestion={marketQuestion}
        side={side}
        placedAt={placedAt}
        deadline={deadline}
        walletAddress={walletAddress}
      />

      {/* Visible card preview */}
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="show"
        className="rounded-2xl overflow-hidden border border-hairline"
        style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-canvas-soft border-b border-hairline">
          <div className="flex items-center gap-2">
            <span className="text-base">🔐</span>
            <span className="text-ink font-semibold text-sm tracking-tight">PredIQ</span>
          </div>
          <span className="eyebrow text-[10px]">prediq.app</span>
        </div>

        {/* Body */}
        <div className="bg-canvas px-5 pt-5 pb-4 flex flex-col gap-4">
          <div>
            <div className="eyebrow text-[10px] mb-2">My Prediction</div>
            <div className="text-ink text-base font-medium leading-snug tracking-tight">
              {marketQuestion}
            </div>
          </div>

          {/* Side badge */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: side ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
              border: `1px solid ${side ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}
          >
            <span className="text-xl">{side ? '✅' : '❌'}</span>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: side ? '#34d399' : '#f87171' }}
            >
              {side ? 'YES' : 'NO'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-body text-sm">
            <span>🔐</span>
            <span>Amount: Encrypted</span>
          </div>

          <div className="flex gap-6 text-xs">
            <div>
              <div className="eyebrow text-[10px] mb-0.5">Placed</div>
              <div className="text-body">
                {new Date(placedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div>
              <div className="eyebrow text-[10px] mb-0.5">Closes</div>
              <div className="text-body">
                {new Date(deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-hairline pt-3 text-[11px] text-mute leading-relaxed">
            Encrypted with <span className="text-breeze">Zama FHE</span> · Your position is private
            🔐
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-canvas-soft border-t border-hairline eyebrow text-[10px] text-mute">
          {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : ''}
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={downloadCard}
          disabled={capturing}
          className="pill pill-outline flex-1 text-sm"
        >
          {capturing ? (
            <span className="spin inline-block w-4 h-4 border-2 border-current/40 border-t-transparent rounded-full" />
          ) : (
            '⬇ Download Card'
          )}
        </button>
        <button
          onClick={shareToX}
          disabled={capturing}
          className="pill pill-primary flex-1 text-sm"
        >
          {capturing ? (
            <span className="spin inline-block w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full" />
          ) : (
            'Share on 𝕏'
          )}
        </button>
      </div>
    </>
  )
}

// ── Place Bet ────────────────────────────────────────────────────────────────
function BetSection({
  id,
  signer,
  address,
  onDone,
  marketQuestion,
  deadline,
}: {
  id: number
  signer: JsonRpcSigner | null
  address: string | null
  onDone: () => void
  marketQuestion: string
  deadline: number
}) {
  const [amount, setAmount] = useState('')
  const [side, setSide] = useState<boolean>(true)
  const [status, setStatus] = useState<TxSt>('idle')
  const [msg, setMsg] = useState('')
  const [betMeta, setBetMeta] = useState<{
    side: boolean
    placedAt: number
    txHash: string
  } | null>(null)
  const toast = useToast()

  // ERC7984 operator gate — the market must be approved as a CST operator before it can pull stake.
  type OpState = 'checking' | 'needs-approval' | 'approved'
  const [opState, setOpState] = useState<OpState>('checking')
  const [apprStatus, setApprStatus] = useState<TxSt>('idle')
  const [apprMsg, setApprMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!address) {
      setOpState('checking')
      return
    }
    setOpState('checking')
    getCSTReadContract()
      .isOperator(address, PM_ADDRESS)
      .then((ok: boolean) => {
        if (!cancelled) setOpState(ok ? 'approved' : 'needs-approval')
      })
      .catch(() => {
        if (!cancelled) setOpState('needs-approval')
      })
    return () => {
      cancelled = true
    }
  }, [address])

  async function approveOperator() {
    if (!signer) {
      setApprStatus('error')
      setApprMsg('Connect your wallet to approve CST.')
      return
    }
    try {
      setApprStatus('pending')
      setApprMsg('Confirm in your wallet…')
      const tx = await getCSTContract(signer).setOperator(PM_ADDRESS, 2000000000n)
      // Optimistic — show approved immediately; confirmation happens in background.
      setApprStatus('success')
      setApprMsg('CST operator approved.')
      toast('PredIQ approved as CST operator ✓', 'success')
      setOpState('approved')
      tx.wait().catch(() => {})
    } catch (e: unknown) {
      setApprMsg(e instanceof Error ? e.message : String(e))
      setApprStatus('error')
    }
  }

  async function placeBet(e: React.FormEvent) {
    e.preventDefault()
    if (!signer || !address) {
      setStatus('error')
      setMsg('Connect your wallet to place a bet.')
      return
    }
    try {
      setStatus('pending')
      setMsg('Encrypting bet with FHE…')
      const fhevm = await getFhevmInstance()
      const enc = await fhevm
        .createEncryptedInput(PM_ADDRESS, address)
        .add64(BigInt(amount))
        .addBool(side)
        .encrypt()
      setMsg('Confirm in your wallet…')
      const contract = getPMContract(signer)
      const tx = await contract.bet(id, enc.handles[0], enc.handles[1], enc.inputProof)
      // Show success as soon as the tx is submitted — don't block on block confirmation
      // (~12s on Sepolia). cst:refresh and onDone fire in the background once mined.
      const placedAt = Date.now()
      addMyBet(address, { marketId: id, side, amount, ts: placedAt, txHash: tx.hash })
      setBetMeta({ side, placedAt, txHash: tx.hash })
      setStatus('success')
      setMsg('Bet placed. Amount and side are encrypted on-chain.')
      toast('Bet placed — amount & side encrypted on-chain 🔐', 'success')
      tx.wait()
        .then(() => {
          window.dispatchEvent(new Event('cst:refresh'))
          setTimeout(onDone, 8000)
        })
        .catch(() => {})
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  const busy = status === 'pending'

  // Operator-approval gate (only when a wallet is connected).
  if (address && opState !== 'approved') {
    return (
      <div className="card p-6 fade-up">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-ink text-lg">Place your bet</h2>
          <span className="eyebrow">FHE encrypted</span>
        </div>
        {opState === 'checking' ? (
          <p className="text-mute text-sm">Checking CST approval…</p>
        ) : (
          <>
            <p className="text-mute text-sm mb-6">
              PredIQ pulls your stake as a confidential CST transfer. Approve it once as a CST
              operator — ERC7984 uses time-bounded operators, not ERC-20 allowances.
            </p>
            <button
              onClick={approveOperator}
              disabled={apprStatus === 'pending'}
              className="pill pill-primary w-full"
            >
              {apprStatus === 'pending' && (
                <span className="spin inline-block w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full" />
              )}
              {apprStatus === 'pending' ? apprMsg : 'Approve PredIQ to use your CST'}
            </button>
            <TxStatus status={apprStatus} message={apprStatus !== 'idle' ? apprMsg : undefined} />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="card p-6 fade-up">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-ink text-lg">Place your bet</h2>
          {address && opState === 'approved' && (
            <span className="eyebrow text-[11px] text-emerald-400">✓ CST approved</span>
          )}
        </div>
        <span className="eyebrow">FHE encrypted</span>
      </div>
      <p className="text-mute text-sm mb-6">
        Your amount and side are encrypted in your browser before they hit the chain. Nobody — not
        even the contract — sees them until resolution.
      </p>

      <form onSubmit={placeBet} className="flex flex-col gap-4">
        {/* Side picker — selected flips to white-filled pill */}
        <div role="group" aria-label="Choose your side" className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSide(true)}
            aria-pressed={side}
            className={`pill w-full py-4 flex-col gap-0.5 ${side ? 'pill-primary' : 'pill-outline'}`}
          >
            <span className="text-base">YES</span>
            <span className="text-[10px] opacity-60">it will happen</span>
          </button>
          <button
            type="button"
            onClick={() => setSide(false)}
            aria-pressed={!side}
            className={`pill w-full py-4 flex-col gap-0.5 ${!side ? 'pill-primary' : 'pill-outline'}`}
          >
            <span className="text-base">NO</span>
            <span className="text-[10px] opacity-60">it won't</span>
          </button>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="bet-stake-amount" className="eyebrow block mb-2">Stake amount</label>
          <input
            id="bet-stake-amount"
            required
            type="number"
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 100"
            className="input-xai"
          />
        </div>

        <p className="flex items-center gap-2 text-mute text-[12px]">
          <span>🔒</span>
          Bets are final — positions lock to prevent last-minute manipulation.
        </p>

        {/* Live encryption — visible while the bet is being encrypted + sent. */}
        <AnimatePresence>
          {busy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <EncryptionVisualizer />
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit" disabled={busy} className="pill pill-primary w-full">
          {busy && (
            <span aria-hidden="true" className="spin inline-block w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full" />
          )}
          {busy ? msg : `Encrypt & bet ${side ? 'YES' : 'NO'}`}
        </button>

        <AnimatePresence>
          {status === 'success' && betMeta && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex items-center gap-2 text-ink text-sm"
            >
              <AnimatedCheck size={18} className="text-[#34d399]" />
              <span>{msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {status !== 'success' && (
          <TxStatus status={status} message={status === 'error' ? msg : undefined} />
        )}
      </form>

      {/* Share card — shown immediately after successful bet */}
      <AnimatePresence>
        {status === 'success' && betMeta && address && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mt-6 pt-6 border-t border-hairline flex flex-col items-center"
          >
            <div className="eyebrow text-[11px] mb-4 text-center">Share your prediction</div>
            <BetShareSuccess
              marketId={id}
              marketQuestion={marketQuestion}
              side={betMeta.side}
              placedAt={betMeta.placedAt}
              deadline={deadline * 1000}
              walletAddress={address}
              txHash={betMeta.txHash}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Resolve ───────────────────────────────────────────────────────────────────
function ResolveSection({
  id,
  signer,
  onDone,
}: {
  id: number
  signer: JsonRpcSigner | null
  onDone: () => void
}) {
  const [winningSide, setWinningSide] = useState<boolean>(true)
  const [status, setStatus] = useState<TxSt>('idle')
  const [msg, setMsg] = useState('')
  const toast = useToast()

  async function resolve() {
    if (!signer) {
      setStatus('error')
      setMsg('Connect your wallet.')
      return
    }
    try {
      setStatus('pending')
      setMsg('Resolving market…')
      const tx = await getPMContract(signer).resolve(id, winningSide)
      await tx.wait()
      setStatus('success')
      setMsg('Market resolved.')
      toast('Market resolved ✓', 'success')
      setTimeout(onDone, 1000)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <div className="card p-6">
      <div className="eyebrow mb-2">Resolver action</div>
      <h2 className="text-ink text-lg mb-1">Resolve market</h2>
      <p className="text-mute text-sm mb-5">You are the resolver. Pick the winning side.</p>
      <div role="group" aria-label="Select winning side" className="grid grid-cols-2 gap-3 mb-4">
        {(['YES', 'NO'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setWinningSide(s === 'YES')}
            aria-pressed={(s === 'YES') === winningSide}
            className={`pill w-full ${(s === 'YES') === winningSide ? 'pill-primary' : 'pill-outline'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={resolve}
        disabled={status === 'pending'}
        className="pill pill-primary w-full"
      >
        {status === 'pending' && (
          <span aria-hidden="true" className="spin inline-block w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full" />
        )}
        {status === 'pending' ? 'Resolving…' : 'Resolve'}
      </button>
      <TxStatus status={status} message={msg} />
    </div>
  )
}

// ── Finalize Pools ────────────────────────────────────────────────────────────
function FinalizeSection({
  id,
  signer,
  onDone,
}: {
  id: number
  signer: JsonRpcSigner | null
  onDone: () => void
}) {
  const [status, setStatus] = useState<TxSt>('idle')
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<{ yes: string; no: string } | null>(null)
  const toast = useToast()

  async function finalize() {
    if (!signer) {
      setStatus('error')
      setMsg('Connect your wallet.')
      return
    }
    try {
      setStatus('pending')
      setMsg('Fetching pool handles…')
      const [yesPool, noPool] = await getPMReadContract().getPools(id)

      setMsg('Requesting decryption from the KMS relayer (may take 30-60s)…')
      const fhevm = await getFhevmInstance()
      const dec = await fhevm.publicDecrypt([yesPool, noPool])

      const yesVal = (dec.clearValues as Record<string, bigint>)[yesPool]
      const noVal = (dec.clearValues as Record<string, bigint>)[noPool]
      setPreview({ yes: yesVal?.toString() ?? '0', no: noVal?.toString() ?? '0' })

      setMsg('Submitting proof on-chain…')
      const tx = await getPMContract(signer).finalizePools(
        id,
        dec.abiEncodedClearValues,
        dec.decryptionProof,
      )
      await tx.wait()
      setStatus('success')
      setMsg('Pools finalized.')
      toast('Pools finalized — totals revealed ✓', 'success')
      setTimeout(onDone, 1000)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <div className="card p-6">
      <div className="eyebrow mb-2">Reveal step</div>
      <h2 className="text-ink text-lg mb-1">Finalize pools</h2>
      <p className="text-mute text-sm mb-5">
        Decrypt the total pool sizes via the KMS relayer, then submit the proof on-chain.
      </p>
      {preview && (
        <div className="mb-4 text-sm text-body bg-canvas-soft border border-hairline rounded-lg px-3 py-2">
          YES pool <span className="text-ink font-mono">{preview.yes}</span> · NO pool{' '}
          <span className="text-ink font-mono">{preview.no}</span>
        </div>
      )}
      <button
        onClick={finalize}
        disabled={status === 'pending'}
        className="pill pill-primary w-full"
      >
        {status === 'pending' ? msg : 'Decrypt & finalize'}
      </button>
      <TxStatus status={status} message={status !== 'idle' ? msg : undefined} />
    </div>
  )
}

// ── Claim ─────────────────────────────────────────────────────────────────────
function ClaimSection({
  id,
  signer,
  address,
  market,
}: {
  id: number
  signer: JsonRpcSigner | null
  address: string
  market: MarketStruct
}) {
  const [status, setStatus] = useState<TxSt>('idle')
  const [msg, setMsg] = useState('')
  const [payout, setPayout] = useState<string | null>(null)
  const toast = useToast()

  async function claim() {
    if (!signer) {
      setStatus('error')
      setMsg('Connect your wallet.')
      return
    }
    try {
      setStatus('pending')
      setMsg('Claiming on-chain…')
      const already = await getPMReadContract().hasClaimed(id, address)
      if (!already) {
        const tx = await getPMContract(signer).claim(id)
        await tx.wait()
      }

      setMsg('Fetching payout handle…')
      const payoutHandle: string = await getPMReadContract().getPayout(id)
      if (payoutHandle === ZeroHash) {
        setStatus('success')
        setMsg('You did not win this market.')
        return
      }

      setMsg('Requesting user decrypt from the KMS relayer (signature required)…')
      const fhevm = await getFhevmInstance()
      const keypair = fhevm.generateKeypair()
      const startTs = Math.floor(Date.now() / 1000)
      const eip712 = fhevm.createEIP712(keypair.publicKey, [PM_ADDRESS], startTs, 1)
      const sig = await signEip712(signer, eip712)

      const results = await fhevm.userDecrypt(
        [{ handle: payoutHandle as `0x${string}`, contractAddress: PM_ADDRESS }],
        keypair.privateKey,
        keypair.publicKey,
        sig,
        [PM_ADDRESS],
        address,
        startTs,
        1,
      )
      const clearPayout = results[payoutHandle as `0x${string}`] as bigint
      setPayout(clearPayout.toString())
      setStatus('success')
      setMsg('Payout revealed.')
      toast('Payout claimed 🎉', 'success')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  const totalPool = market.totalPool
  const winningPool = market.winningPool

  return (
    <div className="card p-6">
      <div className="eyebrow mb-2">Winner action</div>
      <h2 className="text-ink text-lg mb-3">Claim winnings</h2>
      <div className="text-sm text-mute mb-5">
        Total pool <span className="text-ink font-mono">{totalPool.toString()}</span> · Winning pool
        ({market.winningSide ? 'YES' : 'NO'}){' '}
        <span className="text-ink font-mono">{winningPool.toString()}</span>
      </div>
      {payout !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mb-4 card bg-canvas-soft px-4 py-3"
        >
          <div className="eyebrow">Your payout</div>
          <AnimatedNumber value={Number(payout)} className="display text-3xl mt-1 block" />
        </motion.div>
      )}
      <button onClick={claim} disabled={status === 'pending'} className="pill pill-primary w-full">
        {status === 'pending' ? msg : 'Claim & reveal payout'}
      </button>
      <TxStatus status={status} message={status !== 'idle' ? msg : undefined} />
    </div>
  )
}

// ── Your positions (right rail) ─────────────────────────────────────────────────
function PositionsPanel({
  marketId,
  address,
  refreshKey,
}: {
  marketId: number
  address: string | null
  refreshKey: number
}) {
  // re-read localStorage on every refreshKey change (a bet was just placed)
  const bets: MyBet[] = address ? getMyBetsForMarket(address, marketId) : []
  void refreshKey

  const totalYes = bets.filter(b => b.side).reduce((s, b) => s + Number(b.amount || 0), 0)
  const totalNo = bets.filter(b => !b.side).reduce((s, b) => s + Number(b.amount || 0), 0)

  return (
    <div className="card p-6 lg:sticky lg:top-24">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-ink text-lg">Your positions</h2>
        <span className="eyebrow">
          {bets.length} bet{bets.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="text-mute text-[12px] mb-5">
        Visible only on this device — encrypted on-chain.
      </p>

      {!address && <p className="text-mute text-sm">Connect your wallet to see your bets.</p>}

      {address && bets.length === 0 && (
        <p className="text-mute text-sm">No bets on this market yet.</p>
      )}

      {address && bets.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-px bg-hairline border border-hairline rounded-lg overflow-hidden mb-5">
            <div className="bg-canvas-card p-3">
              <div className="eyebrow text-mute">YES staked</div>
              <div className="text-ink font-mono text-lg mt-0.5">{totalYes}</div>
            </div>
            <div className="bg-canvas-card p-3">
              <div className="eyebrow text-mute">NO staked</div>
              <div className="text-ink font-mono text-lg mt-0.5">{totalNo}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {bets.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-hairline last:border-0 pb-2 last:pb-0"
              >
                <span
                  className={`pill ${b.side ? 'pill-primary' : 'pill-outline'} pointer-events-none px-3 py-1 text-[12px]`}
                >
                  {b.side ? 'YES' : 'NO'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-ink font-mono text-sm">{b.amount}</div>
                  <div className="eyebrow text-mute mt-0.5">{new Date(b.ts).toLocaleString()}</div>
                </div>
                {b.txHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${b.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="View transaction on Etherscan"
                    className="eyebrow text-mute hover:text-ink transition-colors shrink-0"
                  >
                    tx ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Link
        to="/my-bets"
        className="eyebrow text-mute hover:text-ink transition-colors mt-5 inline-block"
      >
        All my bets →
      </Link>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function MarketDetailPage({ signer, address }: Props) {
  const { id } = useParams<{ id: string }>()
  const marketId = Number(id)
  const { market, loading, error, refresh } = useMarket(marketId)
  const [betKey, setBetKey] = useState(0)
  const onBet = () => {
    setBetKey(k => k + 1)
    refresh()
  }

  const [resolvedAt, setResolvedAt] = useState<number | null>(null)
  const [resolveTxHash, setResolveTxHash] = useState<string | null>(null)
  const [resolutionSource, setResolutionSource] = useState<string | null>(null)

  useEffect(() => {
    if (!market?.resolved) return
    let cancelled = false
    const contract = getPMReadContract()
    contract
      .queryFilter(contract.filters['MarketResolved'](marketId))
      .then(async logs => {
        if (cancelled || logs.length === 0) return
        const log = logs[0]
        setResolveTxHash(log.transactionHash)
        const block = await readProvider.getBlock(log.blockNumber)
        if (!cancelled && block) setResolvedAt(block.timestamp)
      })
      .catch(console.error)
    getMarketResolutionSource(marketId)
      .then(src => {
        if (!cancelled) setResolutionSource(src)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [market?.resolved, marketId])

  if (loading) return <div role="status" className="max-w-lg mx-auto px-6 py-12 text-mute text-sm">Loading…</div>
  if (error || !market)
    return <div role="alert" className="max-w-lg mx-auto px-6 py-12 text-[#ffc285] text-sm">Error: {error}</div>

  const now = Math.floor(Date.now() / 1000)
  const deadline = Number(market.resolveDeadline)
  const isResolver = address?.toLowerCase() === market.resolver.toLowerCase()
  const pastDeadline = now >= deadline

  const marketStatus = getMarketStatus(market)

  return (
    <PageMotion className="max-w-5xl mx-auto px-6 pt-12 pb-20">
      <Link to="/" className="eyebrow hover:text-ink transition-colors mb-4 inline-block">
        ← Markets
      </Link>

      <div className="mb-8 px-4 py-3.5 rounded-lg border border-hairline bg-white/[0.03] text-mute text-sm">
        🔐 Your bet amount is encrypted on-chain using Zama FHE — validators cannot see your
        position size or chosen side
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 eyebrow mb-3">
          <span
            className={`w-1.5 h-1.5 rounded-full ${marketStatus.pulse ? 'animate-pulse' : ''}`}
            style={{ background: marketStatus.dot }}
          />
          {marketStatus.label}
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="display text-3xl sm:text-4xl leading-snug">{market.question}</h1>
          <a
            href={shareUrl(market.question, marketId)}
            target="_blank"
            rel="noreferrer"
            className="pill pill-outline px-4 py-2 text-[12px] shrink-0 whitespace-nowrap"
          >
            Share on 𝕏
          </a>
        </div>
        <p className="eyebrow mt-3">
          Deadline {new Date(deadline * 1000).toLocaleString()} · Resolver{' '}
          {market.resolver.slice(0, 6)}…{market.resolver.slice(-4)}
        </p>
        <div className="mt-3">
          <MarketCountdown market={market} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          {/* Odds hidden — premium explainer, not a missing feature */}
          <OddsHiddenPanel market={market} marketId={marketId} />

          {/* Bet — open markets before deadline */}
          {!market.resolved && !pastDeadline && (
            <BetSection
              id={marketId}
              signer={signer}
              address={address}
              onDone={onBet}
              marketQuestion={market.question}
              deadline={deadline}
            />
          )}

          {/* Past deadline but not resolved yet — info */}
          {!market.resolved && pastDeadline && !isResolver && (
            <div className="card p-5 text-sm text-mute">
              Betting closed. Waiting for the resolver to resolve this market.
            </div>
          )}

          {/* Resolve — resolver only, after deadline */}
          {!market.resolved && pastDeadline && isResolver && (
            <ResolveSection id={marketId} signer={signer} onDone={refresh} />
          )}

          {/* Dispute banner — resolved but not yet finalized */}
          {market.resolved && !market.finalized && resolvedAt !== null && (
            <DisputeBanner
              resolvedAt={resolvedAt}
              resolverAddress={market.resolver}
              resolutionSource={resolutionSource}
              txHash={resolveTxHash}
            />
          )}

          {/* Finalize — after resolve, before finalize */}
          {market.resolved && !market.finalized && (
            <FinalizeSection id={marketId} signer={signer} onDone={refresh} />
          )}

          {/* Claim — after finalize */}
          {market.finalized && address && (
            <ClaimSection id={marketId} signer={signer} address={address} market={market} />
          )}

          {/* Resolved + finalized summary */}
          {market.finalized &&
            (() => {
              const total = market.totalPool
              const win = market.winningPool
              const lose = total > win ? total - win : 0n
              const yes = market.winningSide ? win : lose
              const no = market.winningSide ? lose : win
              const denom = total > 0n ? Number(total) : 1
              const yesPct = Math.round((Number(yes) / denom) * 100)
              return (
                <div className="card p-6 fade-up">
                  <div className="flex items-center justify-between mb-4">
                    <span className="eyebrow">Final result</span>
                    <span className="eyebrow text-ink">
                      {market.winningSide ? 'YES' : 'NO'} WON
                    </span>
                  </div>
                  {/* Split bar — monochrome */}
                  <div className="h-2 w-full rounded-full overflow-hidden flex bg-canvas-mid">
                    <div className="bg-ink h-full" style={{ width: `${yesPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 eyebrow">
                    <span>
                      YES · {yes.toString()} ({yesPct}%)
                    </span>
                    <span>
                      {no.toString()} ({100 - yesPct}%) · NO
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-hairline text-mute text-[12px]">
                    Total pool revealed via the KMS:{' '}
                    <span className="text-body font-mono">{total.toString()}</span> · individual
                    bets stayed private.
                  </div>
                </div>
              )
            })()}

          {/* Anonymous activity feed — encrypted bets, no amounts/sides */}
          <ActivityFeed marketId={marketId} />

          {/* Privacy proof — how FHE protects this market */}
          <PrivacyProofPanel />

          {/* Live encryption visualizer — always visible, shows the FHE transform */}
          <EncryptionVisualizer />
        </div>

        {/* Right rail — your positions on this market */}
        <PositionsPanel marketId={marketId} address={address} refreshKey={betKey} />
      </div>
    </PageMotion>
  )
}
