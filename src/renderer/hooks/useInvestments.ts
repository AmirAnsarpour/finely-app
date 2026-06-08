import { useState, useEffect, useCallback, useRef } from 'react'
import type { Investment, InvestmentTransactionType } from '../types'
import { fileManager } from '../utils/fileManager'
import { generateId } from '../utils/formatters'

function signedQty(type: InvestmentTransactionType, quantity: number): number {
  return type === 'sell' ? -quantity : quantity
}

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading]          = useState(true)
  const [refreshing, setRefreshing]    = useState(false)
  const [error, setError]              = useState<string | null>(null)
  const initialized = useRef(false)

  const loadData = useCallback(async () => {
    const isRefresh = initialized.current
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      setInvestments(await fileManager.readInvestments())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investments')
    } finally {
      initialized.current = true
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Records a buy or sell of `quantity` units of `assetId`. Buys add to the
  // existing balance (or create a new holding); sells reduce it. Either way
  // the transaction is appended to the holding's history. A holding whose
  // balance reaches zero is dropped from the list automatically.
  const recordTransaction = useCallback(async (
    assetId: string, type: InvestmentTransactionType, quantity: number, date: string, note?: string
  ) => {
    const tx = { id: generateId(), type, quantity, date, note: note || undefined, createdAt: new Date().toISOString() }
    const existing = investments.find(i => i.assetId === assetId)

    let updated: Investment[]
    if (existing) {
      const newQuantity = Math.max(0, existing.quantity + signedQty(type, quantity))
      updated = newQuantity === 0
        ? investments.filter(i => i.id !== existing.id)
        : investments.map(i => i.id === existing.id
          ? { ...i, quantity: newQuantity, transactions: [...i.transactions, tx] }
          : i)
    } else {
      if (type === 'sell') return // nothing to sell — no existing holding
      const newInvestment: Investment = {
        id: generateId(),
        assetId,
        quantity,
        transactions: [tx],
        createdAt: new Date().toISOString(),
      }
      updated = [...investments, newInvestment]
    }
    setInvestments(updated)
    await fileManager.writeInvestments(updated)
  }, [investments])

  const deleteTransaction = useCallback(async (investmentId: string, transactionId: string) => {
    const updated = investments
      .map(i => {
        if (i.id !== investmentId) return i
        const transactions = i.transactions.filter(t => t.id !== transactionId)
        const quantity = transactions.reduce((s, t) => s + signedQty(t.type, t.quantity), 0)
        return { ...i, transactions, quantity: Math.max(0, quantity) }
      })
      .filter(i => i.quantity > 0)
    setInvestments(updated)
    await fileManager.writeInvestments(updated)
  }, [investments])

  return { investments, loading, refreshing, error, loadData, recordTransaction, deleteTransaction }
}
