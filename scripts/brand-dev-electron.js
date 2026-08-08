// Dev mode runs the stock Electron.app binary straight out of node_modules,
// whose own Info.plist says "Electron" — that's what the Dock's hover
// tooltip and App Switcher read, and it's a property of that actual bundle,
// not something app.setName() (a JS-side Electron API) can override. This
// patches the dev bundle's name + icon to match Finely so dev mode looks
// like the real app. Re-applied on every `bun run dev` (see predev in
// package.json) since a fresh `bun install` resets node_modules/electron.
const { existsSync, mkdtempSync, rmSync, copyFileSync } = require('fs')
const { execFileSync } = require('child_process')
const path = require('path')
const os = require('os')

if (process.platform !== 'darwin') process.exit(0)

const electronAppPath = path.join(
  path.dirname(require.resolve('electron/package.json')),
  'dist',
  'Electron.app'
)
const infoPlistPath = path.join(electronAppPath, 'Contents', 'Info.plist')
if (!existsSync(infoPlistPath)) process.exit(0)

execFileSync('plutil', ['-replace', 'CFBundleName', '-string', 'Finely', infoPlistPath])
execFileSync('plutil', ['-replace', 'CFBundleDisplayName', '-string', 'Finely', infoPlistPath])

const sourceIcon = path.join(__dirname, '../src/renderer/assets/macIcon.png')
const iconsPath = path.join(electronAppPath, 'Contents', 'Resources', 'electron.icns')
if (existsSync(sourceIcon)) {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'finely-icon-'))
  const iconset = path.join(tmpDir, 'icon.iconset')
  execFileSync('mkdir', ['-p', iconset])
  const sizes = [16, 32, 128, 256, 512]
  for (const size of sizes) {
    execFileSync('sips', ['-z', String(size), String(size), sourceIcon, '--out', path.join(iconset, `icon_${size}x${size}.png`)], { stdio: 'ignore' })
    const size2x = size * 2
    execFileSync('sips', ['-z', String(size2x), String(size2x), sourceIcon, '--out', path.join(iconset, `icon_${size}x${size}@2x.png`)], { stdio: 'ignore' })
  }
  const builtIcns = path.join(tmpDir, 'icon.icns')
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', builtIcns])
  copyFileSync(builtIcns, iconsPath)
  rmSync(tmpDir, { recursive: true, force: true })
}

console.log('Branded dev Electron.app as Finely')
