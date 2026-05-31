import { contextBridge, ipcRenderer } from 'electron'

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
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close')
})
