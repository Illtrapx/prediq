import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Null when env is missing so the UI can degrade gracefully instead of crashing.
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export type CreatorApplication = {
  wallet_address: string
  name: string
  email: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// ── Market categories (off-chain metadata; markets themselves live on-chain) ────
export const CATEGORIES = ['Crypto', 'Sports', 'Politics', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

function sanitizeUrl(raw: string): string | undefined {
  try {
    const u = new URL(raw)
    return (u.protocol === 'http:' || u.protocol === 'https:') ? raw : undefined
  } catch { return undefined }
}

/** Persist a market's category and optional resolution source. No-op when Supabase env is missing. */
export async function setMarketCategory(marketId: number, category: Category, resolutionSource?: string): Promise<void> {
  if (!supabase) return
  const row: Record<string, unknown> = { market_id: marketId, category }
  if (resolutionSource) {
    const safe = sanitizeUrl(resolutionSource)
    if (safe) row.resolution_source = safe
  }
  await supabase.from('market_categories').upsert(row)
}

/** Get the resolution source URL for a single market. Null when unset or Supabase unavailable. */
export async function getMarketResolutionSource(marketId: number): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('market_categories')
    .select('resolution_source')
    .eq('market_id', marketId)
    .maybeSingle()
  if (error || !data) return null
  return (data as { resolution_source: string | null }).resolution_source
}

/** Map of on-chain market id → category. Empty when Supabase is unavailable. */
export async function getMarketCategories(): Promise<Record<number, Category>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('market_categories').select('market_id, category')
  if (error || !data) return {}
  const out: Record<number, Category> = {}
  for (const row of data as { market_id: number; category: Category }[]) out[row.market_id] = row.category
  return out
}
