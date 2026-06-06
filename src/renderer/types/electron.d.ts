interface UpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  downloadUrl: string | null
}

interface ElectronAPI {
  readData: (file: string) => Promise<unknown>
  writeData: (file: string, data: unknown) => Promise<boolean>
  setDataFolder: (folder: string) => Promise<boolean>
  getDataFolder: () => Promise<string>
  selectFolder: () => Promise<string | null>
  exportCSV: (data: { transactions: unknown[]; categories: unknown[]; currencySymbol: string }) => Promise<boolean>
  exportZip: () => Promise<boolean>
  importZip: () => Promise<boolean>
  openExternal: (url: string) => Promise<void>
  showNotification: (data: { title: string; body: string }) => Promise<boolean>
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void

  platform: string
  getAppVersion: () => Promise<string>
  checkForUpdate: () => Promise<UpdateInfo>
  downloadUpdate: (url: string) => Promise<string>
  applyUpdate: (tempPath: string) => Promise<void>
  onUpdateProgress: (cb: (pct: number) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
