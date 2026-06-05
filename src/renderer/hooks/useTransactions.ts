import { useState, useEffect, useCallback, useRef } from 'react'
import type { Transaction } from '../types'
import { fileManager } from '../utils/fileManager'
import { generateId } from '../utils/formatters'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const initialized = useRef(false)

  const loadData = useCallback(async () => {
    const isRefresh = initialized.current
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      setTransactions(await fileManager.readTransactions())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      initialized.current = true
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = { ...t, id: generateId(), createdAt: new Date().toISOString() }
    const updated = [newTx, ...transactions]
    setTransactions(updated)
    await fileManager.writeTransactions(updated)
  }, [transactions])

  const updateTransaction = useCallback(async (id: string, changes: Partial<Transaction>) => {
    const updated = transactions.map(t => t.id === id ? { ...t, ...changes } : t)
    setTransactions(updated)
    await fileManager.writeTransactions(updated)
  }, [transactions])

  const deleteTransaction = useCallback(async (id: string) => {
    const updated = transactions.filter(t => t.id !== id)
    setTransactions(updated)
    await fileManager.writeTransactions(updated)
  }, [transactions])

  return { transactions, loading, refreshing, error, loadData, addTransaction, updateTransaction, deleteTransaction }
}
