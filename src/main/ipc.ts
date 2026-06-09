import { ipcMain, dialog, app, BrowserWindow, shell, Notification } from 'electron'
import { checkForUpdate, downloadUpdate, applyUpdateAndRestart } from './updater'
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

// ── Per-file write queue — prevents concurrent-write corruption ───────────────
const writeQueues = new Map<string, Promise<void>>()
function queueWrite(fp: string, fn: () => void): Promise<void> {
  const prev = writeQueues.get(fp) ?? Promise.resolve()
  const next = prev.then(fn).catch(() => {})
  writeQueues.set(fp, next)
  return next
}

// ── RFC 4180 CSV field quoting ────────────────────────────────────────────────
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

const FILE_MAP: Record<string, string> = {
  transactions: 'transactions.json',
  categories: 'categories.json',
  settings: 'settings.json',
  installments: 'installments.json',
  goals: 'goals.json',
  investments: 'investments.json',
  accounts: 'accounts.json'
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
    if (data === undefined || data === null) throw new Error(`write-data: refusing null/undefined payload for "${file}"`)
    if (typeof data !== 'object') throw new Error(`write-data: payload for "${file}" must be an object or array`)
    ensureDataFolder()
    const fp = filePath(file)
    await queueWrite(fp, () => fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8'))
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
      const catName = csvField(cat ? String(cat['name']) : String(t['category']))
      const amount = csvField(`${currencySymbol}${t['amount']}`)
      const note = csvField(String(t['note'] ?? ''))
      return `${t['date']},${t['type']},${catName},${amount},${note}`
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

  ipcMain.handle('show-notification', async (_event, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
    return true
  })

  ipcMain.handle('open-external', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  // Fetches the last traded price for a Nobitex market symbol (e.g. "BTCUSDT", "BTCIRT").
  // Runs in the main process so the renderer's CSP doesn't need to allow external hosts.
  ipcMain.handle('fetch-market-price', async (_event, symbol: string) => {
    try {
      const res = await fetch(`https://apiv2.nobitex.ir/v3/orderbook/${symbol}`)
      if (!res.ok) return null
      const data = await res.json()
      if (data?.status !== 'ok' || typeof data?.lastTradePrice !== 'string') return null
      return { lastTradePrice: data.lastTradePrice as string }
    } catch {
      return null
    }
  })

  ipcMain.handle('get-app-version', () => app.getVersion())

  ipcMain.handle('update-check', () => checkForUpdate())

  ipcMain.handle('update-download', async (event, url: string) => {
    return downloadUpdate(url, (pct) => {
      event.sender.send('update-progress', pct)
    })
  })

  ipcMain.handle('update-apply', (_event, tempPath: string) => {
    applyUpdateAndRestart(tempPath)
  })

  ipcMain.on('window-minimize', () => BrowserWindow.getFocusedWindow()?.minimize())

  ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })

  ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close())
}
