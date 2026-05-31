import { useState, useEffect, useCallback, useRef } from 'react'
import type { Transaction, Category, AppSettings, Installment } from '../types'
import { fileManager } from '../utils/fileManager'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../utils/defaults'
import { generateId, todayString } from '../utils/formatters'

interface DataState {
  transactions: Transaction[]
  categories: Category[]
  settings: AppSettings
  installments: Installment[]
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
  addInstallment: (inst: Omit<Installment, 'id' | 'createdAt'>) => Promise<void>
  updateInstallment: (id: string, changes: Partial<Installment>) => Promise<void>
  deleteInstallment: (id: string) => Promise<void>
  markPaymentPaid: (installmentId: string, paymentId: string) => Promise<void>
  markPaymentUnpaid: (installmentId: string, paymentId: string) => Promise<void>
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
  const [installments, setInstallments] = useState<Installment[]>([])
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

      const [txData, catData, settingsData, instData] = await Promise.all([
        fileManager.readTransactions(),
        fileManager.readCategories(),
        fileManager.readSettings(),
        fileManager.readInstallments()
      ])

      const resolvedSettings: AppSettings = settingsData
        ? { ...DEFAULT_SETTINGS, ...settingsData, dataFolder }
        : { ...DEFAULT_SETTINGS, dataFolder }

      const resolvedCategories = catData.length > 0 ? catData : DEFAULT_CATEGORIES

      setTransactions(txData)
      setCategories(resolvedCategories)
      setSettings(resolvedSettings)
      setInstallments(instData)

      if (catData.length === 0) {
        await fileManager.writeCategories(DEFAULT_CATEGORIES)
      }
      if (!settingsData) {
        await fileManager.writeSettings(resolvedSettings)
      }

      // Notify about installment payments due in the next 7 days (once per day)
      if (instData.length > 0) {
        const todayStr = todayString()
        const lastNotified = localStorage.getItem('installments-notified-date')
        if (lastNotified !== todayStr) {
          const today = new Date(todayStr + 'T00:00:00')
          const sevenDaysLater = new Date(today)
          sevenDaysLater.setDate(today.getDate() + 7)

          const upcoming = instData.filter(inst =>
            inst.payments.some(p => {
              if (p.isPaid) return false
              const due = new Date(p.dueDate + 'T00:00:00')
              return due >= today && due <= sevenDaysLater
            })
          )

          if (upcoming.length > 0) {
            localStorage.setItem('installments-notified-date', todayStr)
            const names = upcoming.map(i => i.name).join(', ')
            const msg = upcoming.length === 1
              ? `Payment due soon: ${names}`
              : `${upcoming.length} payments due in the next 7 days: ${names}`
            await fileManager.showNotification('Upcoming Payments', msg)
          }
        }
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

  const addInstallment = useCallback(async (inst: Omit<Installment, 'id' | 'createdAt'>) => {
    const newInst: Installment = { ...inst, id: generateId(), createdAt: new Date().toISOString() }
    const updated = [...installments, newInst]
    setInstallments(updated)
    await fileManager.writeInstallments(updated)
  }, [installments])

  const updateInstallment = useCallback(async (id: string, changes: Partial<Installment>) => {
    const updated = installments.map(i => i.id === id ? { ...i, ...changes } : i)
    setInstallments(updated)
    await fileManager.writeInstallments(updated)
  }, [installments])

  const deleteInstallment = useCallback(async (id: string) => {
    const updated = installments.filter(i => i.id !== id)
    setInstallments(updated)
    await fileManager.writeInstallments(updated)
  }, [installments])

  const markPaymentPaid = useCallback(async (installmentId: string, paymentId: string) => {
    const updated = installments.map(inst => {
      if (inst.id !== installmentId) return inst
      return {
        ...inst,
        payments: inst.payments.map(p =>
          p.id === paymentId ? { ...p, isPaid: true, paidDate: todayString() } : p
        )
      }
    })
    setInstallments(updated)
    await fileManager.writeInstallments(updated)
  }, [installments])

  const markPaymentUnpaid = useCallback(async (installmentId: string, paymentId: string) => {
    const updated = installments.map(inst => {
      if (inst.id !== installmentId) return inst
      return {
        ...inst,
        payments: inst.payments.map(p => {
          if (p.id !== paymentId) return p
          const { paidDate: _, ...rest } = p
          return { ...rest, isPaid: false }
        })
      }
    })
    setInstallments(updated)
    await fileManager.writeInstallments(updated)
  }, [installments])

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
    installments,
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
    addInstallment,
    updateInstallment,
    deleteInstallment,
    markPaymentPaid,
    markPaymentUnpaid,
    refreshData: loadData,
    exportCSV,
    exportZip,
    importZip,
    selectFolder
  }
}
