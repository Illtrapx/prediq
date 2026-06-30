import type { MarketStruct } from './contract'

export type MarketStatus = { label: string; dot: string; pulse: boolean }

export function getMarketStatus(market: MarketStruct | undefined): MarketStatus {
  if (!market) return { label: 'UNKNOWN', dot: '#7d8187', pulse: false }
  if (market.finalized) return { label: 'FINALIZED', dot: '#a0c3ec', pulse: false }
  if (market.resolved) return { label: 'RESOLVED', dot: '#ff7a17', pulse: true }
  const now = Math.floor(Date.now() / 1000)
  if (Number(market.resolveDeadline) < now) return { label: 'CLOSED', dot: '#7d8187', pulse: false }
  return { label: 'OPEN', dot: '#ffffff', pulse: true }
}
