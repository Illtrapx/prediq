import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ethers } from 'ethers'

// Crawler-facing share page for a single market. Pure SPAs can't inject
// per-route OG tags (bots don't run JS), so this serverless route renders
// real meta tags (question + dynamic /api/og image) and bounces humans to the
// in-app market route.
//   /m/:id  →  rewrite  →  /api/share?id=:id

const PM_ADDRESS = '0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9'
const RPC_URL = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'

// Minimal ABI — just enough to read the public question + deadline.
const ABI = [
  'function getMarket(uint256 id) view returns (tuple(string question, uint64 resolveDeadline, address resolver, bool resolved, bool winningSide, bool finalized, bool hasBets, uint64 totalPool, uint64 winningPool) market)',
]

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idRaw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const id = Number(idRaw)
  const host = (req.headers['x-forwarded-host'] ?? req.headers.host ?? 'prediq-umber.vercel.app').toString()
  const origin = `https://${host}`
  const appUrl = `${origin}/market/${Number.isFinite(id) ? id : ''}`

  let question = 'A confidential prediction on PredIQ'
  let deadline = 0
  try {
    if (Number.isFinite(id)) {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const pm = new ethers.Contract(PM_ADDRESS, ABI, provider)
      const m = await pm.getMarket(id)
      if (m?.question) question = String(m.question)
      deadline = Number(m?.resolveDeadline ?? 0)
    }
  } catch {
    /* fall back to defaults — still render valid tags */
  }

  const title = esc(question)
  const desc = 'Bet amount and side stay encrypted on-chain via Zama FHE until the market resolves.'
  const ogImage = `${origin}/api/og?q=${encodeURIComponent(question.slice(0, 140))}&deadline=${deadline}`

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} · PredIQ</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="PredIQ" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${appUrl}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${ogImage}" />
<link rel="canonical" href="${appUrl}" />
<meta http-equiv="refresh" content="0; url=${appUrl}" />
<script>location.replace(${JSON.stringify(appUrl)})</script>
</head>
<body style="background:#0a0a0a;color:#fafafa;font-family:system-ui,sans-serif;padding:40px">
Redirecting to <a href="${appUrl}" style="color:#a0c3ec">${esc(question)}</a>…
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Cache at the edge so repeated unfurls don't re-hit the RPC.
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400')
  return res.status(200).send(html)
}
