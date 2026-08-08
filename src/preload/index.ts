import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  readData: (file: string) => ipcRenderer.invoke('read-data', file),
  writeData: (file: string, data: unknown) => ipcRenderer.invoke('write-data', { file, data }),
  getDataFolder: () => ipcRenderer.invoke('get-data-folder'),
  setDataFolder: (folder: string) => ipcRenderer.invoke('set-data-folder', folder),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  exportCSV: (data: unknown) => ipcRenderer.invoke('export-csv', data),
  exportZip: () => ipcRenderer.invoke('export-zip'),
  importZip: () => ipcRenderer.invoke('import-zip'),
  showNotification: (data: { title: string; body: string }) => ipcRenderer.invoke('show-notification', data),
  fetchMarketPrice: (symbol: string) => ipcRenderer.invoke('fetch-market-price', symbol),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),

  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdate: () => ipcRenderer.invoke('update-check'),
  downloadUpdate: (url: string) => ipcRenderer.invoke('update-download', url),
  applyUpdate: (tempPath: string) => ipcRenderer.invoke('update-apply', tempPath),
  onUpdateProgress: (cb: (pct: number) => void) => {
    const handler = (_: IpcRendererEvent, pct: number) => cb(pct)
    ipcRenderer.on('update-progress', handler)
    return () => ipcRenderer.removeListener('update-progress', handler)
  },

  aiHasKey: () => ipcRenderer.invoke('ai-has-key'),
  aiSaveKey: (key: string) => ipcRenderer.invoke('ai-save-key', key),
  aiClearKey: () => ipcRenderer.invoke('ai-clear-key'),
  aiRunAnalysis: (params: {
    provider: string
    model: string
    baseUrl?: string
    systemPrompt: string
    userPrompt: string
  }) => ipcRenderer.invoke('ai-run-analysis', params),
  aiListModels: (params: { provider: string; baseUrl?: string; apiKey?: string }) => ipcRenderer.invoke('ai-list-models', params),
  aiChatStream: (params: {
    provider: string
    model: string
    baseUrl?: string
    systemPrompt: string
    messages: { role: 'user' | 'assistant'; content: string }[]
  }) => ipcRenderer.invoke('ai-chat-stream', params),
  onAIChatChunk: (cb: (chunk: string) => void) => {
    const handler = (_: IpcRendererEvent, chunk: string) => cb(chunk)
    ipcRenderer.on('ai-chat-chunk', handler)
    return () => ipcRenderer.removeListener('ai-chat-chunk', handler)
  },

  vaultStatus: () => ipcRenderer.invoke('vault-status'),
  vaultUnlock: (passphrase: string) => ipcRenderer.invoke('vault-unlock', passphrase),
  vaultEnable: (passphrase: string) => ipcRenderer.invoke('vault-enable', passphrase),
  vaultDisable: () => ipcRenderer.invoke('vault-disable'),
  vaultChangePassphrase: (passphrase: string) => ipcRenderer.invoke('vault-change-passphrase', passphrase),
  vaultLock: () => ipcRenderer.invoke('vault-lock'),
  vaultTryOsUnlock: () => ipcRenderer.invoke('vault-try-os-unlock'),
  vaultEnableOsUnlock: () => ipcRenderer.invoke('vault-enable-os-unlock'),
  vaultDisableOsUnlock: () => ipcRenderer.invoke('vault-disable-os-unlock'),

  setTrayBalance: (text: string) => ipcRenderer.send('tray-set-balance', text)
})
