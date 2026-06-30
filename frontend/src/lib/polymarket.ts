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

type PolymarketRaw = { question: string; category?: string }

function isPolymarketRaw(m: unknown): m is PolymarketRaw {
  return (
    typeof m === 'object' &&
    m !== null &&
    typeof (m as { question?: unknown }).question === 'string'
  )
}

/**
 * Fetches active markets from Polymarket's public gamma API and returns up to 12
 * as PredIQ suggestions. Category is inferred from Polymarket's category slug;
 * unknown slugs map to 'Other'. Network errors propagate to the caller.
 */
export async function fetchPolymarketSuggestions(): Promise<PolymarketSuggestion[]> {
  const res = await fetch(
    'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=30',
  )
  if (!res.ok) throw new Error(`Polymarket ${res.status}`)
  const data: unknown[] = await res.json()

  return data
    .filter(isPolymarketRaw)
    .map(m => ({
      question: m.question,
      category: CAT_MAP[m.category?.toLowerCase() ?? ''] ?? 'Other',
    }))
    .slice(0, 12)
}
