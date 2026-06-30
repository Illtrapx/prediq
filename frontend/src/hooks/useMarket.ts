import { useState, useEffect, useCallback } from 'react'
import { getPMReadContract } from '../lib/contract'
import type { MarketStruct } from '../lib/contract'

export function useMarket(id: number) {
  const [market, setMarket] = useState<MarketStruct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    // Data-loading effect: flag loading before the async fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const contract = getPMReadContract()
    contract
      .getMarket(id)
      .then((m: MarketStruct) => {
        setMarket(m)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, tick])

  return { market, loading, error, refresh }
}
