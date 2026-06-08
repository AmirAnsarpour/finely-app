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
  }
})
