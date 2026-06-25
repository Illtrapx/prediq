import type { Category } from './supabase'

export interface PolymarketSuggestion {
  question: string
  category: Category
}

const CAT_MAP: Record<string, Category> = {
  crypto: 'Crypto',
  sports: 'Sports',
  politics: 'Politics',
  elections: 'Politics',
  football: 'Sports',
  basketball: 'Sports',
  soccer: 'Sports',
  baseball: 'Sports',
}

export async function fetchPolymarketSuggestions(): Promise<PolymarketSuggestion[]> {
  const res = await fetch(
    'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=30'
  )
  if (!res.ok) throw new Error(`Polymarket ${res.status}`)
  const data: unknown[] = await res.json()

  return data
    .filter(
      (m): m is Record<string, unknown> =>
        typeof m === 'object' && m !== null && typeof (m as Record<string, unknown>).question === 'string'
    )
    .map((m) => ({
      question: m.question as string,
      category: CAT_MAP[String(m.category ?? '').toLowerCase()] ?? 'Other',
    }))
    .slice(0, 12)
}
