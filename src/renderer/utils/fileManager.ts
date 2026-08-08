import type { Account, Transaction, Category, AppSettings, Installment, Goal, Investment, AIProvider, SpendingAnalysis, AIUsageEntry, AIChatMessage, VaultStatus, OsUnlockResult } from '../types'

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

  async exportCSV(transactions: Transaction[], categories: Category[], accounts: Account[], currencySymbol: string): Promise<boolean> {
    return window.electronAPI.exportCSV({ transactions, categories, accounts, currencySymbol })
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

  async readAccounts(): Promise<Account[]> {
    const data = await window.electronAPI.readData('accounts')
    return Array.isArray(data) ? data : []
  },

  async writeAccounts(data: Account[]): Promise<void> {
    await window.electronAPI.writeData('accounts', data)
  },

  async showNotification(title: string, body: string): Promise<void> {
    await window.electronAPI.showNotification({ title, body })
  },

  async readAnalyses(): Promise<SpendingAnalysis[]> {
    const data = await window.electronAPI.readData('analyses')
    return Array.isArray(data) ? data : []
  },

  async writeAnalyses(data: SpendingAnalysis[]): Promise<void> {
    await window.electronAPI.writeData('analyses', data)
  },

  async aiHasKey(): Promise<boolean> {
    return window.electronAPI.aiHasKey()
  },

  async aiSaveKey(key: string): Promise<void> {
    await window.electronAPI.aiSaveKey(key)
  },

  async aiClearKey(): Promise<void> {
    await window.electronAPI.aiClearKey()
  },

  async listAIModels(provider: AIProvider, baseUrl: string | undefined, apiKey: string | undefined): Promise<string[]> {
    return window.electronAPI.aiListModels({ provider, baseUrl, apiKey })
  },

  async runAIAnalysis(provider: AIProvider, model: string, baseUrl: string | undefined, systemPrompt: string, userPrompt: string) {
    return window.electronAPI.aiRunAnalysis({ provider, model, baseUrl, systemPrompt, userPrompt })
  },

  async streamAIChat(
    provider: AIProvider,
    model: string,
    baseUrl: string | undefined,
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[]
  ) {
    return window.electronAPI.aiChatStream({ provider, model, baseUrl, systemPrompt, messages })
  },

  onAIChatChunk(cb: (chunk: string) => void): () => void {
    return window.electronAPI.onAIChatChunk(cb)
  },

  async readAIUsage(): Promise<AIUsageEntry[]> {
    const data = await window.electronAPI.readData('aiUsage')
    return Array.isArray(data) ? data : []
  },

  async writeAIUsage(data: AIUsageEntry[]): Promise<void> {
    await window.electronAPI.writeData('aiUsage', data)
  },

  async readAIChatMessages(): Promise<AIChatMessage[]> {
    const data = await window.electronAPI.readData('aiChat')
    return Array.isArray(data) ? data : []
  },

  async writeAIChatMessages(data: AIChatMessage[]): Promise<void> {
    await window.electronAPI.writeData('aiChat', data)
  },

  async vaultStatus(): Promise<VaultStatus> {
    return window.electronAPI.vaultStatus()
  },

  async vaultUnlock(passphrase: string): Promise<boolean> {
    return window.electronAPI.vaultUnlock(passphrase)
  },

  async vaultEnable(passphrase: string): Promise<boolean> {
    return window.electronAPI.vaultEnable(passphrase)
  },

  async vaultDisable(): Promise<boolean> {
    return window.electronAPI.vaultDisable()
  },

  async vaultChangePassphrase(passphrase: string): Promise<boolean> {
    return window.electronAPI.vaultChangePassphrase(passphrase)
  },

  async vaultTryOsUnlock(): Promise<OsUnlockResult> {
    return window.electronAPI.vaultTryOsUnlock()
  },

  async vaultEnableOsUnlock(): Promise<boolean> {
    return window.electronAPI.vaultEnableOsUnlock()
  },

  async vaultDisableOsUnlock(): Promise<boolean> {
    return window.electronAPI.vaultDisableOsUnlock()
  },

  async vaultLock(): Promise<boolean> {
    return window.electronAPI.vaultLock()
  },

  setTrayBalance(text: string): void {
    window.electronAPI.setTrayBalance(text)
  }
}
