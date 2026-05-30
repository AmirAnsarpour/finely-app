import { useState, useEffect, useCallback, useRef } from 'react'
import type { Transaction, Category, AppSettings } from '../types'
import { fileManager } from '../utils/fileManager'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../utils/defaults'
import { generateId, todayString } from '../utils/formatters'

interface DataState {
  transactions: Transaction[]
  categories: Category[]
  settings: AppSettings
  loading: boolean
  refreshing: boolean
  error: string | null
}

interface DataActions {
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  updateTransaction: (id: string, changes: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  addCategory: (c: Omit<Category, 'id'>) => Promise<void>
  updateCategory: (id: string, changes: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  updateSettings: (changes: Partial<AppSettings>) => Promise<void>
  refreshData: () => Promise<void>
  exportCSV: () => Promise<boolean>
  exportZip: () => Promise<boolean>
  importZip: () => Promise<boolean>
  selectFolder: () => Promise<string | null>
}

export type UseDataReturn = DataState & DataActions

export function useData(): UseDataReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  const loadData = useCallback(async () => {
    const isRefresh = initialized.current
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const dataFolder = await fileManager.getDataFolder()

      const [txData, catData, settingsData] = await Promise.all([
        fileManager.readTransactions(),
        fileManager.readCategories(),
        fileManager.readSettings()
      ])

      const resolvedSettings: AppSettings = settingsData
        ? { ...DEFAULT_SETTINGS, ...settingsData, dataFolder }
        : { ...DEFAULT_SETTINGS, dataFolder }

      const resolvedCategories = catData.length > 0 ? catData : DEFAULT_CATEGORIES

      setTransactions(txData)
      setCategories(resolvedCategories)
      setSettings(resolvedSettings)

      if (catData.length === 0) {
        await fileManager.writeCategories(DEFAULT_CATEGORIES)
      }
      if (!settingsData) {
        await fileManager.writeSettings(resolvedSettings)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      initialized.current = true
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const addCategory = useCallback(async (c: Omit<Category, 'id'>) => {
    const newCat: Category = { ...c, id: generateId() }
    const updated = [...categories, newCat]
    setCategories(updated)
    await fileManager.writeCategories(updated)
  }, [categories])

  const updateCategory = useCallback(async (id: string, changes: Partial<Category>) => {
    const updated = categories.map(c => c.id === id ? { ...c, ...changes } : c)
    setCategories(updated)
    await fileManager.writeCategories(updated)
  }, [categories])

  const deleteCategory = useCallback(async (id: string) => {
    const updated = categories.filter(c => c.id !== id)
    setCategories(updated)
    await fileManager.writeCategories(updated)
  }, [categories])

  const updateSettings = useCallback(async (changes: Partial<AppSettings>) => {
    const updated = { ...settings, ...changes }
    setSettings(updated)
    await fileManager.writeSettings(updated)
    if (changes.dataFolder) {
      await fileManager.setDataFolder(changes.dataFolder)
    }
  }, [settings])

  const exportCSV = useCallback(async () => {
    return fileManager.exportCSV(transactions, categories, settings.currencySymbol)
  }, [transactions, categories, settings.currencySymbol])

  const exportZip = useCallback(async () => fileManager.exportZip(), [])

  const importZip = useCallback(async () => {
    const ok = await fileManager.importZip()
    if (ok) await loadData()
    return ok
  }, [loadData])

  const selectFolder = useCallback(async () => fileManager.selectFolder(), [])

  return {
    transactions,
    categories,
    settings,
    loading,
    refreshing,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    updateSettings,
    refreshData: loadData,
    exportCSV,
    exportZip,
    importZip,
    selectFolder
  }
}
