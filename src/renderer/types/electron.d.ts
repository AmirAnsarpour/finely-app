/// <reference types="vite/client" />

import type { AIProvider, AICallResult, AIChatStreamParams, VaultStatus, OsUnlockResult } from './index'

interface UpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  downloadUrl: string | null
}

interface RunAIAnalysisParams {
  provider: AIProvider
  model: string
  baseUrl?: string
  systemPrompt: string
  userPrompt: string
}

interface ListAIModelsParams {
  provider: AIProvider
  baseUrl?: string
  apiKey?: string   // omit to use the already-saved key
}

interface ElectronAPI {
  readData: (file: string) => Promise<unknown>
  writeData: (file: string, data: unknown) => Promise<boolean>
  setDataFolder: (folder: string) => Promise<boolean>
  getDataFolder: () => Promise<string>
  selectFolder: () => Promise<string | null>
  exportCSV: (data: { transactions: unknown[]; categories: unknown[]; accounts: unknown[]; currencySymbol: string }) => Promise<boolean>
  exportZip: () => Promise<boolean>
  importZip: () => Promise<boolean>
  openExternal: (url: string) => Promise<void>
  showNotification: (data: { title: string; body: string }) => Promise<boolean>
  fetchMarketPrice: (symbol: string) => Promise<{ lastTradePrice: string } | null>
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void

  platform: string
  getAppVersion: () => Promise<string>
  checkForUpdate: () => Promise<UpdateInfo>
  downloadUpdate: (url: string) => Promise<string>
  applyUpdate: (tempPath: string) => Promise<void>
  onUpdateProgress: (cb: (pct: number) => void) => () => void

  aiHasKey: () => Promise<boolean>
  aiSaveKey: (key: string) => Promise<boolean>
  aiClearKey: () => Promise<boolean>
  aiRunAnalysis: (params: RunAIAnalysisParams) => Promise<AICallResult>
  aiListModels: (params: ListAIModelsParams) => Promise<string[]>
  aiChatStream: (params: AIChatStreamParams) => Promise<AICallResult>
  onAIChatChunk: (cb: (chunk: string) => void) => () => void

  vaultStatus: () => Promise<VaultStatus>
  vaultUnlock: (passphrase: string) => Promise<boolean>
  vaultEnable: (passphrase: string) => Promise<boolean>
  vaultDisable: () => Promise<boolean>
  vaultChangePassphrase: (passphrase: string) => Promise<boolean>
  vaultLock: () => Promise<boolean>
  vaultTryOsUnlock: () => Promise<OsUnlockResult>
  vaultEnableOsUnlock: () => Promise<boolean>
  vaultDisableOsUnlock: () => Promise<boolean>

  setTrayBalance: (text: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
