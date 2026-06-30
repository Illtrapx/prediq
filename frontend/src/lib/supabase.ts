import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are absent (e.g. local dev without .env.local).
// All callers must guard: `if (!supabase) return`.
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export type CreatorApplication = {
  wallet_address: string
  name: string
  email: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export const CATEGORIES = ['Crypto', 'Sports', 'Politics', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

type MarketCategoryRow = {
  market_id: number
  category: Category
  resolution_source?: string
}

type MarketCategorySelectRow = {
  market_id: number
  category: Category
}

type ResolutionSourceRow = {
  resolution_source: string | null
}

function sanitizeUrl(raw: string): string | undefined {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : undefined
  } catch {
    return undefined
  }
}

export async function setMarketCategory(
  marketId: number,
  category: Category,
  resolutionSource?: string,
): Promise<void> {
  if (!supabase) return
  const row: MarketCategoryRow = { market_id: marketId, category }
  if (resolutionSource) {
    const safe = sanitizeUrl(resolutionSource)
    if (safe) row.resolution_source = safe
  }
  await supabase.from('market_categories').upsert(row)
}

export async function getMarketResolutionSource(marketId: number): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('market_categories')
    .select('resolution_source')
    .eq('market_id', marketId)
    .maybeSingle()
  if (error || !data) return null
  return (data as ResolutionSourceRow).resolution_source
}

export async function getMarketCategories(): Promise<Record<number, Category>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('market_categories').select('market_id, category')
  if (error || !data) return {}
  const out: Record<number, Category> = {}
  for (const row of data as MarketCategorySelectRow[]) {
    out[row.market_id] = row.category
  }
  return out
}
