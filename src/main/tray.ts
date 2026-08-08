import { Menu, Tray, nativeImage } from 'electron'

interface TrayCallbacks {
  iconPath: string
  showMainWindow: () => void
  toggleQuickAddWindow: () => void
  quitApp: () => void
}

let trayInstance: Tray | null = null

// Shows a live figure (e.g. total balance) near the tray icon. macOS
// supports an always-visible title text next to the icon (Tray.setTitle);
// Windows/Linux tray icons have no room for adjacent text, so there the
// same figure goes into the hover tooltip instead — still cross-platform,
// just a different amount of visibility.
export function setTrayTitle(text: string): void {
  if (!trayInstance) return
  if (process.platform === 'darwin') {
    trayInstance.setTitle(text)
  } else {
    trayInstance.setToolTip(text ? `Finely — ${text}` : 'Finely')
  }
}

export function createTray(cb: TrayCallbacks): Tray {
  const icon = nativeImage.createFromPath(cb.iconPath)
  const tray = new Tray(icon)
  trayInstance = tray
  tray.setToolTip('Finely')

  const menu = Menu.buildFromTemplate([
    { label: 'Open App', click: () => cb.showMainWindow() },
    { type: 'separator' },
    { label: 'Quit Finely', click: () => cb.quitApp() },
  ])

  // Left-click opens the small Quick Add popup only — never the full app.
  // Right-click opens the menu, where "Open App" shows the real window.
  // Linux tray implementations (GTK/AppIndicator) don't reliably distinguish
  // click vs right-click, so a persistent menu is the standard convention
  // there. On Windows/macOS we keep left-click free for the quick-add
  // toggle and pop the menu manually on right-click.
  if (process.platform === 'linux') {
    tray.setContextMenu(menu)
  } else {
    tray.on('click', () => cb.toggleQuickAddWindow())
    tray.on('right-click', () => tray.popUpContextMenu(menu))
  }

  return tray
}
