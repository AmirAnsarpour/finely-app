import type { Transaction, Category, AppSettings, Installment, Goal, Investment } from '../types'

export const fileManager = {
  async readTransactions(): Promise<Transaction[]> {
    const data = await window.electronAPI.readData('transactions')
    return Array.isArray(data) ? data : []
  },

  async writeTransactions(data: Transaction[]): Promise<void> {
    await window.electronAPI.writeData('transactions', data)
  },

  async readCategories(): Promise<Category[]> {
    const data = await window.electronAPI.readData('categories')
    return Array.isArray(data) ? data : []
  },

  async writeCategories(data: Category[]): Promise<void> {
    await window.electronAPI.writeData('categories', data)
  },

  async readSettings(): Promise<AppSettings | null> {
    const data = await window.electronAPI.readData('settings')
    return data as AppSettings | null
  },

  async writeSettings(data: AppSettings): Promise<void> {
    await window.electronAPI.writeData('settings', data)
  },

  async getDataFolder(): Promise<string> {
    return window.electronAPI.getDataFolder()
  },

  async setDataFolder(folder: string): Promise<void> {
    await window.electronAPI.setDataFolder(folder)
  },

  async selectFolder(): Promise<string | null> {
    return window.electronAPI.selectFolder()
  },

  async exportCSV(transactions: Transaction[], categories: Category[], currencySymbol: string): Promise<boolean> {
    return window.electronAPI.exportCSV({ transactions, categories, currencySymbol })
  },

  async exportZip(): Promise<boolean> {
    return window.electronAPI.exportZip()
  },

  async importZip(): Promise<boolean> {
    return window.electronAPI.importZip()
  },

  async readInstallments(): Promise<Installment[]> {
    const data = await window.electronAPI.readData('installments')
    return Array.isArray(data) ? data : []
  },

  async writeInstallments(data: Installment[]): Promise<void> {
    await window.electronAPI.writeData('installments', data)
  },

  async readGoals(): Promise<Goal[]> {
    const data = await window.electronAPI.readData('goals')
    return Array.isArray(data) ? data : []
  },

  async writeGoals(data: Goal[]): Promise<void> {
    await window.electronAPI.writeData('goals', data)
  },

  async readInvestments(): Promise<Investment[]> {
    const data = await window.electronAPI.readData('investments')
    return Array.isArray(data) ? data : []
  },

  async writeInvestments(data: Investment[]): Promise<void> {
    await window.electronAPI.writeData('investments', data)
  },

  async showNotification(title: string, body: string): Promise<void> {
    await window.electronAPI.showNotification({ title, body })
  }
}
