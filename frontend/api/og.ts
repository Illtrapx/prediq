import { ImageResponse } from '@vercel/og'
import { createElement as h } from 'react'

// Dynamic Open Graph card for a market. Link unfurls (X, Discord, Telegram)
// show a branded, per-market preview.
//   /api/og?q=<question>&deadline=<unix seconds>
// Edge runtime: @vercel/og's streaming ImageResponse is built for edge (it
// hangs on the Node runtime). Real edge has working fetch for the font; only
// the local `vercel dev` edge emulator lacks fetch — so verify on a deploy.
export const config = { runtime: 'edge' }

// Inter (one weight) fetched at runtime — satori needs real font data.
const FONT_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-600-normal.woff'

function fmtDeadline(deadline: number): string {
  if (!deadline) return 'Confidential prediction market'
  const ms = deadline * 1000
  const now = Date.now()
  if (now >= ms) return 'Market closed'
  const d = new Date(ms)
  return `Closes ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default async function handler(req: Request) {
  try {
    return await render(req)
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
    return new Response(`og error: ${msg}`, { status: 500, headers: { 'content-type': 'text/plain' } })
  }
}

async function render(req: Request) {
  // req.url is absolute on edge but can be a bare path under the node web
  // handler / `vercel dev` — supply a base so URL() never throws.
  const { searchParams } = new URL(req.url, 'http://localhost')
  const rawQ = (searchParams.get('q') ?? 'A confidential prediction').slice(0, 140)
  const deadline = Number(searchParams.get('deadline') ?? '0')

  let fontData: ArrayBuffer | undefined
  try {
    const r = await fetch(FONT_URL)
    if (r.ok) fontData = await r.arrayBuffer()
  } catch {
    /* fall back to default font shaping */
  }

  const node = h(
    'div',
    {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        background: '#0a0a0a',
        backgroundImage:
          'radial-gradient(900px circle at 100% 0%, rgba(255,122,23,0.16), transparent 55%)',
        fontFamily: 'Inter',
        color: '#fafafa',
      },
    },
    // Header row — brand
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
      h('div', { style: { fontSize: '34px' } }, '🔐'),
      h('div', { style: { fontSize: '30px', fontWeight: 600, letterSpacing: '-0.02em' } }, 'PredIQ'),
      h(
        'div',
        {
          style: {
            marginLeft: '8px',
            fontSize: '18px',
            color: '#a0c3ec',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          },
        },
        'Confidential',
      ),
    ),
    // Question
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '22px' } },
      h(
        'div',
        {
          style: {
            fontSize: '60px',
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            maxWidth: '1000px',
          },
        },
        rawQ,
      ),
      h(
        'div',
        { style: { display: 'flex', gap: '14px', alignItems: 'center' } },
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.14)',
              fontSize: '22px',
              color: '#cbd5e1',
            },
          },
          '🔒  Bet amount & side encrypted',
        ),
        h(
          'div',
          { style: { fontSize: '22px', color: '#7d8187' } },
          fmtDeadline(deadline),
        ),
      ),
    ),
    // Footer
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '20px',
          color: '#7d8187',
        },
      },
      h('div', null, 'prediq-umber.vercel.app'),
      h('div', { style: { color: '#ffd208' } }, 'Powered by Zama FHE'),
    ),
  )

  return new ImageResponse(node, {
    width: 1200,
    height: 630,
    fonts: fontData
      ? [{ name: 'Inter', data: fontData, weight: 600, style: 'normal' }]
      : undefined,
  })
}
