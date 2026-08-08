import { useCallback } from 'react'
import { fileManager } from '../utils/fileManager'
import { useTransactions } from './useTransactions'
import { useCategories }   from './useCategories'
import { useSettings }     from './useSettings'
import { useInstallments } from './useInstallments'
import { useGoals }        from './useGoals'
import { useInvestments }  from './useInvestments'
import { useAccounts }     from './useAccounts'

export function useData() {
  const tx   = useTransactions()
  const cat  = useCategories()
  const sett = useSettings()
  const inst = useInstallments()
  const goal = useGoals()
  const inv  = useInvestments()
  const acc  = useAccounts()

  const loading    = tx.loading    || cat.loading    || sett.loading    || inst.loading    || goal.loading    || inv.loading    || acc.loading
  const refreshing = tx.refreshing || cat.refreshing || sett.refreshing || inst.refreshing || goal.refreshing || inv.refreshing || acc.refreshing
  const error      = tx.error      || cat.error      || sett.error      || inst.error      || goal.error      || inv.error      || acc.error

  const refreshData = useCallback(async () => {
    await Promise.all([
      tx.loadData(), cat.loadData(), sett.loadData(), inst.loadData(), goal.loadData(), inv.loadData(), acc.loadData(),
    ])
  }, [tx.loadData, cat.loadData, sett.loadData, inst.loadData, goal.loadData, inv.loadData, acc.loadData])

  const exportCSV = useCallback(async () =>
    fileManager.exportCSV(tx.transactions, cat.categories, acc.accounts, sett.settings.currencySymbol),
    [tx.transactions, cat.categories, acc.accounts, sett.settings.currencySymbol])

  const exportZip = useCallback(async () => fileManager.exportZip(), [])

  const importZip = useCallback(async () => {
    const ok = await fileManager.importZip()
    if (ok) await refreshData()
    return ok
  }, [refreshData])

  const selectFolder = useCallback(async () => fileManager.selectFolder(), [])

  return {
    transactions:  tx.transactions,
    categories:    cat.categories,
    settings:      sett.settings,
    installments:  inst.installments,
    goals:         goal.goals,
    investments:   inv.investments,
    accounts:      acc.accounts,
    loading,
    refreshing,
    error,
    addTransaction:    tx.addTransaction,
    updateTransaction: tx.updateTransaction,
    deleteTransaction: tx.deleteTransaction,
    addCategory:       cat.addCategory,
    updateCategory:    cat.updateCategory,
    deleteCategory:    cat.deleteCategory,
    reorderCategories: cat.reorderCategories,
    updateSettings: sett.updateSettings,
    addInstallment:    inst.addInstallment,
    updateInstallment: inst.updateInstallment,
    deleteInstallment: inst.deleteInstallment,
    markPaymentPaid:   inst.markPaymentPaid,
    markPaymentUnpaid: inst.markPaymentUnpaid,
    addGoal:             goal.addGoal,
    updateGoal:          goal.updateGoal,
    deleteGoal:          goal.deleteGoal,
    logGoalContribution: goal.logGoalContribution,
    recordInvestmentTransaction: inv.recordTransaction,
    deleteInvestmentTransaction: inv.deleteTransaction,
    addAccount:    acc.addAccount,
    updateAccount: acc.updateAccount,
    deleteAccount: acc.deleteAccount,
    refreshData,
    exportCSV,
    exportZip,
    importZip,
    selectFolder,
  }
}

export type UseDataReturn = ReturnType<typeof useData>
