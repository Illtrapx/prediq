// Showcase-only synthetic activity. Purely client-side display — no chain
// writes, no persistence, no Supabase. Lets the live demo look active before
// real testnet traffic exists. Set VITE_DEMO_TRADES=off to disable.
const flag = import.meta.env.VITE_DEMO_TRADES as string | undefined
export const DEMO_TRADES = (flag ?? 'on').toLowerCase() !== 'off'

// Deterministic PRNG so seeded rows stay stable across renders and reloads
// (wallets, counts, and relative timestamps don't jump on every poll).
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hex(rand: () => number, len: number): string {
  const chars = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(rand() * 16)]
  return out
}

// Fixed pool of showcase personas — the same wallets surface in a market's
// activity feed and in the global leaderboard, so the two views agree.
export type DemoTrader = { wallet: string; bets: number; correct: number }

export const DEMO_TRADERS: DemoTrader[] = (() => {
  const r = mulberry32(0xc0ffee)
  const out: DemoTrader[] = []
  for (let i = 0; i < 9; i++) {
    const wallet = '0x' + hex(r, 40)
    const bets = 4 + Math.floor(r() * 18)
    const correct = Math.round(bets * (0.45 + r() * 0.45))
    out.push({ wallet, bets, correct })
  }
  return out
})()

export type DemoActivity = { bettor: string; ts: number; fake: true }

// Recent-looking encrypted bets for a single live market, newest first.
export function demoActivity(marketId: number, count = 5): DemoActivity[] {
  const r = mulberry32((marketId + 1) * 2654435761)
  const now = Math.floor(Date.now() / 1000)
  const out: DemoActivity[] = []
  let t = now - (45 + Math.floor(r() * 300)) // most recent: a few min ago
  for (let i = 0; i < count; i++) {
    const trader = DEMO_TRADERS[Math.floor(r() * DEMO_TRADERS.length)]
    out.push({ bettor: trader.wallet, ts: t, fake: true })
    t -= 120 + Math.floor(r() * 1500) // step back in time for older rows
  }
  return out
}

export type DemoRow = { wallet: string; bets: number; correct: number; winRate: number }

// Leaderboard rows for the persona pool.
export function demoLeaderboardRows(): DemoRow[] {
  return DEMO_TRADERS.map(t => ({
    wallet: t.wallet,
    bets: t.bets,
    correct: t.correct,
    winRate: t.bets > 0 ? (t.correct / t.bets) * 100 : 0,
  }))
}
