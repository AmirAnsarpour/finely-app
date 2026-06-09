import { useState, useEffect, useCallback, useRef } from 'react'
import type { Account } from '../types'
import { fileManager } from '../utils/fileManager'
import { generateId } from '../utils/formatters'

export function useAccounts() {
  const [accounts, setAccounts]     = useState<Account[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const initialized = useRef(false)

  const loadData = useCallback(async () => {
    const isRefresh = initialized.current
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await fileManager.readAccounts()
      setAccounts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      initialized.current = true
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addAccount = useCallback(async (a: Omit<Account, 'id' | 'createdAt'>) => {
    const newAcc: Account = { ...a, id: generateId(), createdAt: new Date().toISOString() }
    const updated = [...accounts, newAcc]
    setAccounts(updated)
    await fileManager.writeAccounts(updated)
  }, [accounts])

  const updateAccount = useCallback(async (id: string, changes: Partial<Account>) => {
    const updated = accounts.map(a => a.id === id ? { ...a, ...changes } : a)
    setAccounts(updated)
    await fileManager.writeAccounts(updated)
  }, [accounts])

  const deleteAccount = useCallback(async (id: string) => {
    const updated = accounts.filter(a => a.id !== id)
    setAccounts(updated)
    await fileManager.writeAccounts(updated)
  }, [accounts])

  return { accounts, loading, refreshing, error, loadData, addAccount, updateAccount, deleteAccount }
}
