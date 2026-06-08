import { useEffect, useState } from 'react'
import type { Investment } from '../types'
import { getAssetDef } from '../utils/investmentAssets'
import { fetchAssetPrice, type PriceCurrency } from '../utils/investmentPricing'
import { cacheKey, loadPriceCache, savePriceCache } from '../utils/investmentPriceCache'

function assetIdsFromKey(key: string): string[] {
  return key ? key.split(',') : []
}

// Seeds prices from the on-disk cache so the page renders instantly with the
// last known values, then refreshes them once in the background. Live prices
// are only re-fetched when the app is reopened or the held assets/currency change —
// not on a recurring timer — to keep the page fast and avoid hammering the API.
export function useInvestmentPrices(investments: Investment[], currency: PriceCurrency) {
  const assetIdsKey = [...new Set(investments.map(i => i.assetId))].sort().join(',')

  const [prices, setPrices] = useState<Record<string, number | null>>(() => {
    const cache = loadPriceCache()
    const initial: Record<string, number | null> = {}
    for (const id of assetIdsFromKey(assetIdsKey)) {
      const entry = cache[cacheKey(id, currency)]
      if (entry) initial[id] = entry.price
    }
    return initial
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const assetIds = assetIdsFromKey(assetIdsKey)

    if (assetIds.length === 0) {
      setPrices({})
      return
    }

    // Seed instantly from cache (covers assets that weren't in the initial state, e.g. newly added).
    const cache = loadPriceCache()
    setPrices(prev => {
      const seeded = { ...prev }
      for (const id of assetIds) {
        if (seeded[id] != null) continue
        const entry = cache[cacheKey(id, currency)]
        if (entry) seeded[id] = entry.price
      }
      return seeded
    })

    setLoading(true)
    Promise.all(assetIds.map(async (id): Promise<[string, number | null]> => {
      const asset = getAssetDef(id)
      if (!asset) return [id, null]
      try {
        return [id, await fetchAssetPrice(asset, currency)]
      } catch {
        return [id, null]
      }
    })).then(entries => {
      if (cancelled) return
      setPrices(prev => ({ ...prev, ...Object.fromEntries(entries) }))
      const nextCache = { ...loadPriceCache() }
      const now = Date.now()
      for (const [id, price] of entries) {
        if (price != null) nextCache[cacheKey(id, currency)] = { price, updatedAt: now }
      }
      savePriceCache(nextCache)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [assetIdsKey, currency])

  return { prices, loading }
}
