import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import unzipper from 'unzipper'

const CONFIG_PATH = join(app.getPath('userData'), 'finely-config.json')

interface AppConfig {
  dataFolder: string
}

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    }
  } catch {
    // ignore
  }
  return { dataFolder: join(app.getPath('userData'), 'data') }
}

function saveConfig(config: AppConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

let config = loadConfig()

const FILE_MAP: Record<string, string> = {
  transactions: 'transactions.json',
  categories: 'categories.json',
  settings: 'settings.json'
}

function ensureDataFolder(): void {
  if (!fs.existsSync(config.dataFolder)) {
    fs.mkdirSync(config.dataFolder, { recursive: true })
  }
}

function filePath(file: string): string {
  const name = FILE_MAP[file] ?? file
  return join(config.dataFolder, name)
}

export function registerIpcHandlers(): void {
  ipcMain.handle('read-data', async (_event, file: string) => {
    ensureDataFolder()
    const fp = filePath(file)
    if (!fs.existsSync(fp)) return null
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf-8'))
    } catch {
      return null
    }
  })

  ipcMain.handle('write-data', async (_event, { file, data }: { file: string; data: unknown }) => {
    ensureDataFolder()
    fs.writeFileSync(filePath(file), JSON.stringify(data, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle('get-data-folder', async () => config.dataFolder)

  ipcMain.handle('set-data-folder', async (_event, folder: string) => {
    config.dataFolder = folder
    saveConfig(config)
    ensureDataFolder()
    return true
  })

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Data Folder'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('export-csv', async (
    _event,
    { transactions, categories, currencySymbol }: { transactions: Array<Record<string, unknown>>; categories: Array<Record<string, unknown>>; currencySymbol: string }
  ) => {
    const result = await dialog.showSaveDialog({
      defaultPath: 'finely-transactions.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return false

    const header = 'Date,Type,Category,Amount,Note\n'
    const rows = transactions.map((t) => {
      const cat = categories.find((c) => c['id'] === t['category']) as Record<string, unknown> | undefined
      const catName = cat ? String(cat['name']) : String(t['category'])
      const note = String(t['note'] ?? '').replace(/,/g, ';')
      return `${t['date']},${t['type']},${catName},${currencySymbol}${t['amount']},${note}`
    }).join('\n')

    fs.writeFileSync(result.filePath, header + rows, 'utf-8')
    return true
  })

  ipcMain.handle('export-zip', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `finely-backup-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePath) return false

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(result.filePath!)
      const archive = archiver('zip', { zlib: { level: 9 } })
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)
      if (fs.existsSync(config.dataFolder)) {
        archive.directory(config.dataFolder, false)
      }
      archive.finalize()
    })
    return true
  })

  ipcMain.handle('import-zip', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      properties: ['openFile'],
      title: 'Import Finely Backup'
    })
    if (result.canceled || !result.filePaths.length) return false

    ensureDataFolder()
    await fs.createReadStream(result.filePaths[0])
      .pipe(unzipper.Extract({ path: config.dataFolder }))
      .promise()
    return true
  })

  ipcMain.handle('open-external', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.on('window-minimize', () => BrowserWindow.getFocusedWindow()?.minimize())

  ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })

  ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close())
}
