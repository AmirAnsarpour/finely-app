import type { InvestmentAssetDef } from './investmentAssets'
import { TROY_OUNCE_GRAMS } from './investmentAssets'

export type PriceCurrency = 'IRT' | 'USDT'

// XAUT (Tether Gold) tracks ~1 troy ounce of 24-karat (.9999 fine) physical gold —
// used as the reference for deriving prices of the gold assets in our catalog.
const XAUT_SYMBOL = 'XAUT'

async function fetchLastTradePrice(symbol: string): Promise<number | null> {
  const result = await window.electronAPI.fetchMarketPrice(symbol)
  if (!result) return null
  const price = parseFloat(result.lastTradePrice)
  return Number.isFinite(price) ? price : null
}

function marketSymbol(base: string, currency: PriceCurrency): string {
  return `${base}${currency}`
}

async function fetchRawAssetPrice(asset: InvestmentAssetDef, currency: PriceCurrency): Promise<number | null> {
  if (asset.type === 'gold') {
    if (!asset.goldSpec) return null
    const xautPrice = await fetchLastTradePrice(marketSymbol(XAUT_SYMBOL, currency))
    if (xautPrice == null) return null
    const { weightGrams, purity } = asset.goldSpec
    return (xautPrice / TROY_OUNCE_GRAMS) * purity * weightGrams
  }

  if (asset.type === 'crypto') {
    if (asset.id === 'usdt') {
      return currency === 'USDT' ? 1 : fetchLastTradePrice(marketSymbol('USDT', currency))
    }
    return fetchLastTradePrice(marketSymbol(asset.symbol, currency))
  }

  // Fiat currencies have no Nobitex market yet.
  return null
}

// Returns the current price of one unit of `asset`, denominated in `currency`,
// or null if no live price is available (e.g. fiat currencies — not yet supported).
export async function fetchAssetPrice(asset: InvestmentAssetDef, currency: PriceCurrency): Promise<number | null> {
  const raw = await fetchRawAssetPrice(asset, currency)
  if (raw == null) return null
  // Nobitex's "IRT" pairs are actually quoted in Iranian Rial — convert to Toman (1 Toman = 10 Rial).
  return currency === 'IRT' ? raw / 10 : raw
}

export function formatPriceValue(value: number, currency: PriceCurrency): string {
  if (currency === 'IRT') {
    return `${Math.round(value).toLocaleString('en-US')} Toman`
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
