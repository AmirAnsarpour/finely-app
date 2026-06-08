const CACHE_KEY = 'finely:investment-price-cache:v1'

interface CacheEntry {
  price: number
  updatedAt: number
}

type PriceCache = Record<string, CacheEntry>

export function cacheKey(assetId: string, currency: string): string {
  return `${assetId}:${currency}`
}

export function loadPriceCache(): PriceCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function savePriceCache(cache: PriceCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // storage unavailable — caching is a best-effort optimization
  }
}
