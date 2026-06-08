import type { InvestmentAssetType } from '../types'

export interface InvestmentAssetDef {
  id: string
  symbol: string
  name: string
  type: InvestmentAssetType
  icon: string
  color: string
  // Rough reference price in USD, used only to rank holdings by approximate
  // value until live prices have loaded (and as a fallback for assets with
  // no live pricing source yet, e.g. fiat currencies other than USD).
  refPriceUsd: number
  // Physical gold specs — lets us derive a price from XAUT (Tether Gold,
  // ~1 troy ounce of 24k/.9999 fine gold per token).
  goldSpec?: {
    weightGrams: number  // nominal weight of one unit of this asset
    purity: number       // fraction of pure gold by weight (24k = 1, 18k = 0.75, …)
  }
}

export const TROY_OUNCE_GRAMS = 31.1034768

export const INVESTMENT_ASSETS: InvestmentAssetDef[] = [
  // Cryptocurrencies
  { id: 'btc',  symbol: 'BTC',  name: 'Bitcoin',     type: 'crypto', icon: 'bitcoin', color: '#f7931a', refPriceUsd: 60000 },
  { id: 'eth',  symbol: 'ETH',  name: 'Ethereum',    type: 'crypto', icon: 'coins',   color: '#627eea', refPriceUsd: 3000 },
  { id: 'usdt', symbol: 'USDT', name: 'Tether',      type: 'crypto', icon: 'coins',   color: '#26a17b', refPriceUsd: 1 },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin',    type: 'crypto', icon: 'coins',   color: '#2775ca', refPriceUsd: 1 },
  { id: 'bnb',  symbol: 'BNB',  name: 'BNB',         type: 'crypto', icon: 'coins',   color: '#f3ba2f', refPriceUsd: 550 },
  { id: 'ton',  symbol: 'TON',  name: 'Toncoin',     type: 'crypto', icon: 'coins',   color: '#0098ea', refPriceUsd: 5 },

  // Gold
  { id: 'gold-gram', symbol: 'gr',   name: '18K Gold (gram)',        type: 'gold', icon: 'gem', color: '#eab308', refPriceUsd: 75,
    goldSpec: { weightGrams: 1, purity: 0.75 } },
  { id: 'gold-coin', symbol: 'coin', name: 'Gold Coin (Full Bahar)', type: 'gold', icon: 'gem', color: '#facc15', refPriceUsd: 400,
    goldSpec: { weightGrams: 8.1359, purity: 0.9 } },

  // Fiat currencies
  { id: 'usd', symbol: 'USD', name: 'US Dollar',      type: 'fiat', icon: 'dollar-sign', color: '#22c55e', refPriceUsd: 1 },
  { id: 'eur', symbol: 'EUR', name: 'Euro',           type: 'fiat', icon: 'banknote',    color: '#3b82f6', refPriceUsd: 1.1 },
  { id: 'gbp', symbol: 'GBP', name: 'British Pound',  type: 'fiat', icon: 'banknote',    color: '#8b5cf6', refPriceUsd: 1.27 },
  { id: 'try', symbol: 'TRY', name: 'Turkish Lira',   type: 'fiat', icon: 'banknote',    color: '#ef4444', refPriceUsd: 0.03 },
  { id: 'aed', symbol: 'AED', name: 'UAE Dirham',     type: 'fiat', icon: 'banknote',    color: '#06b6d4', refPriceUsd: 0.27 },
]

export function getAssetDef(assetId: string): InvestmentAssetDef | undefined {
  return INVESTMENT_ASSETS.find(a => a.id === assetId)
}

export const ASSET_TYPE_LABELS: Record<InvestmentAssetType, string> = {
  crypto: 'Cryptocurrencies',
  gold: 'Gold',
  fiat: 'Fiat Currencies',
}
