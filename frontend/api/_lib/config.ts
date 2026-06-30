import { createClient } from '@supabase/supabase-js'

export const CST_ADDRESS = '0xF9B73bF34D8EAb58D3d3498714BF22C2a927463B'
export const PM_ADDRESS = '0x5B6Cb01B6AcEBa5148e16fBEa3d1f77e434004d9'

export const RPC_URL = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://qwimhbsdfcjoikrhtyxc.supabase.co'
// SUPABASE_KEY is a publishable anon key, not a service-role key.
// Row-level security (RLS) on the Supabase project is the actual access gate.
// Hardcoding the fallback here is safe by design — it's equivalent to an API key in a public app.
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? 'sb_publishable_UuqUSTGGW0pR9U__BZc5gA_Of7jTUl6'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export function userFacingError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message
    if (
      msg.includes('insufficient funds') ||
      msg.includes('nonce') ||
      msg.includes('gas') ||
      msg.includes('reverted')
    )
      return msg
  }
  return 'Internal server error'
}
