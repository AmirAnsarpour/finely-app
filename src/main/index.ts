import { app, BrowserWindow, shell } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { createTray } from './tray'

// Must run before app is ready — otherwise the Dock/App Switcher fall back
// to the bundled Electron binary's own name ("Electron") instead of ours,
// which is especially visible in dev mode where that binary is unrenamed.
app.setName('Finely')

let mainWindow: BrowserWindow | null = null
let quickAddWindow: BrowserWindow | null = null
let isQuitting = false

// On macOS, use the OS's own traffic-light window controls (no custom close/
// minimize/maximize buttons drawn in the renderer). Everywhere else, stay
// fully frameless — the renderer draws its own minimal caption buttons.
const titleBarOptions: BrowserWindowConstructorOptions =
  process.platform === 'darwin'
    ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 16 } }
    : { frame: false }

function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'finely.png')
    : join(app.getAppPath(), 'src/renderer/assets/finely.png')
}

// macOS Dock icons are expected to have their content inset to ~80% of the
// canvas (Apple's Big Sur+ template) — finely.png is intentionally full-bleed
// for use as the in-app logo and the Windows/Linux taskbar icon, so the Dock
// needs its own pre-padded source instead.
function getMacDockIconPath(): string {
  return join(app.getAppPath(), 'src/renderer/assets/macIcon.png')
}

function getTrayIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'trayIcon.png')
    : join(app.getAppPath(), 'src/renderer/assets/trayIcon.png')
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    ...titleBarOptions,
    backgroundColor: '#000000',
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })
  mainWindow = win

  win.on('ready-to-show', () => {
    win.show()
  })

  // With a tray icon present, closing the window should hide it rather than
  // quit the app — the app keeps running in the tray until "Quit" is chosen.
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  win.on('closed', () => {
    mainWindow = null
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// Shows the main window as-is (whatever page it was last on) — used by the
// tray's "Open App" menu item and the Dock icon click on macOS.
function showMainWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// The tray icon's left-click opens just this small popup — never the full
// app — so logging a transaction never means seeing the dashboard/sidebar.
// It reuses the main renderer bundle at a dedicated route, so it stays in
// sync with the main app's form logic (including transfers) for free.
function openQuickAddWindow(): void {
  if (quickAddWindow) {
    quickAddWindow.show()
    quickAddWindow.focus()
    return
  }

  const win = new BrowserWindow({
    width: 400,
    height: 640,
    minWidth: 360,
    minHeight: 560,
    ...titleBarOptions,
    backgroundColor: '#000000',
    icon: getIconPath(),
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })
  quickAddWindow = win

  win.on('ready-to-show', () => win.show())
  win.on('closed', () => {
    quickAddWindow = null
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/quick-add`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/quick-add' })
  }
}

function toggleQuickAddWindow(): void {
  if (quickAddWindow && quickAddWindow.isVisible()) {
    quickAddWindow.close()
  } else {
    openQuickAddWindow()
  }
}

function quitApp(): void {
  isQuitting = true
  app.quit()
}

app.whenReady().then(() => {
  // In dev mode, macOS shows Electron's own icon in the Dock unless told
  // otherwise — the window's `icon` option (used for win/linux) has no
  // effect on the Dock. Packaged builds don't need this: electron-builder
  // bakes mac.icon into the .app bundle itself.
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(getMacDockIconPath())
  }

  registerIpcHandlers()
  createWindow()
  createTray({
    iconPath: getTrayIconPath(),
    showMainWindow,
    toggleQuickAddWindow,
    quitApp
  })

  app.on('activate', () => {
    showMainWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (isQuitting) app.quit()
})
