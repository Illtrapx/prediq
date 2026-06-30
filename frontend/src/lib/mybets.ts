// Local record of bets the user placed. Stays client-side: amounts/sides are
// encrypted on-chain (no ACL to self pre-resolution), so the only place the user
// can see their own stake + side is the browser that submitted it.

export type MyBet = {
  marketId: number
  side: boolean // true = YES
  amount: string // plaintext stake, as entered
  ts: number // epoch ms
  txHash?: string
}

const key = (addr: string) => `prediq.mybets.${addr.toLowerCase()}`

export function getMyBets(addr: string): MyBet[] {
  try {
    const raw = localStorage.getItem(key(addr))
    return raw ? (JSON.parse(raw) as MyBet[]) : []
  } catch {
    return []
  }
}

export function addMyBet(addr: string, bet: MyBet): void {
  const list = getMyBets(addr)
  list.push(bet)
  localStorage.setItem(key(addr), JSON.stringify(list))
}

// Bets this wallet placed on one market, newest first.
export function getMyBetsForMarket(addr: string, marketId: number): MyBet[] {
  return getMyBets(addr)
    .filter(b => b.marketId === marketId)
    .sort((a, b) => b.ts - a.ts)
}
