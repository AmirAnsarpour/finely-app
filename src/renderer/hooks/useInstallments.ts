import { useState, useEffect, useCallback, useRef } from 'react'
import type { Installment } from '../types'
import { fileManager } from '../utils/fileManager'
import { generateId, todayString } from '../utils/formatters'

export function useInstallments() {
  const [installments, setInstallments] = useState<Installment[]>([])
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
      const data = await fileManager.readInstallments()
      setInstallments(data)

      // Notify about payments due in the next 7 days (once per day)
      if (data.length > 0) {
        const todayStr = todayString()
        const lastNotified = localStorage.getItem('installments-notified-date')
        if (lastNotified !== todayStr) {
          const today = new Date(todayStr + 'T00:00:00')
          const sevenDaysLater = new Date(today)
          sevenDaysLater.setDate(today.getDate() + 7)
          const upcoming = data.filter(inst =>
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
      setError(err instanceof Error ? err.message : 'Failed to load installments')
    } finally {
      initialized.current = true
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

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

  return {
    installments, loading, refreshing, error, loadData,
    addInstallment, updateInstallment, deleteInstallment,
    markPaymentPaid, markPaymentUnpaid,
  }
}
