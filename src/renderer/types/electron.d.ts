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
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
