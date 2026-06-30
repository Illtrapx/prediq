import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Status of a wallet's market-creator access.
 * Resolved via the `get_creator_status` Supabase RPC, which reads the
 * `market_creator_applications` table keyed on lowercased wallet address.
 */
export type AccessStatus =
  | 'loading'       // querying Supabase
  | 'disconnected'  // no wallet connected
  | 'none'          // connected but no application on record
  | 'pending'       // application submitted, awaiting admin approval
  | 'approved'      // allowed to call createMarket()
  | 'rejected'      // application denied

export type ApplyInput = { name: string; email: string; reason: string }

export function useCreatorAccess(address: string | null) {
  const [status, setStatus] = useState<AccessStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!address) {
      setStatus('disconnected')
      return
    }
    if (!supabase) {
      setError('Access service unavailable')
      setStatus('none')
      return
    }
    setStatus('loading')
    const { data, error } = await supabase.rpc('get_creator_status', {
      wallet_addr: address.toLowerCase(),
    })
    if (error) {
      setError(error.message)
      setStatus('none')
      return
    }
    if (!data) {
      setStatus('none')
      return
    }
    setStatus(data as AccessStatus)
  }, [address])

  // Data-loading effect: refresh() queries Supabase and sets state on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    refresh()
  }, [refresh])

  const apply = useCallback(
    async (input: ApplyInput) => {
      if (!address) throw new Error('Connect wallet first')
      if (!supabase) throw new Error('Access service unavailable')
      const { error } = await supabase.from('market_creator_applications').upsert(
        {
          wallet_address: address.toLowerCase(),
          name: input.name,
          email: input.email,
          reason: input.reason,
        },
        { onConflict: 'wallet_address' },
      )
      if (error) throw new Error(error.message)
      setStatus('pending')
    },
    [address],
  )

  return { status, error, refresh, apply }
}
