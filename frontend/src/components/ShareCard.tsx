/**
 * ShareCard — off-screen render target for the bet prediction card.
 * Captured by html2canvas; not visible in the UI.
 *
 * Props:
 *  marketQuestion  — full market question text
 *  side            — true = YES, false = NO
 *  placedAt        — unix timestamp (ms) of the bet
 *  deadline        — unix timestamp (ms) of market close
 *  walletAddress   — user's wallet address (truncated in render)
 */

import { forwardRef } from 'react'

export type ShareCardProps = {
  marketQuestion: string
  side: boolean
  placedAt: number
  deadline: number
  walletAddress: string
}

const fmt = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const trunc = (addr: string) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ marketQuestion, side, placedAt, deadline, walletAddress }, ref) => {
    const sideColor = side ? '#34d399' : '#f87171' // emerald-400 / red-400
    const sideBg = side ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)'
    const sideLabel = side ? 'YES' : 'NO'
    const sideIcon = side ? '✅' : '❌'

    return (
      /*
       * Positioned off-screen but still rendered/painted so html2canvas can capture it.
       * `position:fixed` with very negative coords keeps it out of scroll-space.
       * Explicit pixel dimensions = the canvas output size.
       */
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0px',
          width: '400px',
          height: '500px',
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          background: '#0a0a0a',
          color: '#ffffff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
        }}
      >
        {/* ── Header bar ─────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: '#111314',
            borderBottom: '1px solid #212327',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔐</span>
            <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.02em' }}>PredIQ</span>
          </div>
          <span style={{ fontSize: '11px', color: '#7d8187', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
            prediq.app
          </span>
        </div>

        {/* ── Body ──────────────────────────────────── */}
        <div style={{ flex: 1, padding: '24px 20px 0 20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* Label */}
          <div
            style={{
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#7d8187',
              fontFamily: 'monospace',
              marginBottom: '10px',
            }}
          >
            My Prediction
          </div>

          {/* Market question */}
          <div
            style={{
              fontSize: '20px',
              fontWeight: 500,
              lineHeight: '1.3',
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: '20px',
              minHeight: '52px',
            }}
          >
            {marketQuestion}
          </div>

          {/* Side badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: sideBg,
              border: `1px solid ${sideColor}33`,
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{sideIcon}</span>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: sideColor,
              }}
            >
              {sideLabel}
            </span>
          </div>

          {/* Amount — always encrypted */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#7d8187', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Amount
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', color: '#dadbdf' }}>
              <span>🔐</span>
              <span>Encrypted</span>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#7d8187', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '2px' }}>
                Placed
              </div>
              <div style={{ fontSize: '13px', color: '#dadbdf' }}>{fmt(placedAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#7d8187', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '2px' }}>
                Closes
              </div>
              <div style={{ fontSize: '13px', color: '#dadbdf' }}>{fmt(deadline)}</div>
            </div>
          </div>

          {/* Divider + FHE callout */}
          <div style={{ borderTop: '1px solid #212327', paddingTop: '16px' }}>
            <div style={{ fontSize: '12px', color: '#7d8187', lineHeight: '1.6' }}>
              Encrypted with <span style={{ color: '#a0c3ec' }}>Zama FHE</span>
            </div>
            <div style={{ fontSize: '12px', color: '#7d8187' }}>
              Your position is private 🔐
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────── */}
        <div
          style={{
            padding: '12px 20px',
            background: '#111314',
            borderTop: '1px solid #212327',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#7d8187',
            letterSpacing: '0.06em',
          }}
        >
          {trunc(walletAddress)}
        </div>
      </div>
    )
  },
)

ShareCard.displayName = 'ShareCard'
