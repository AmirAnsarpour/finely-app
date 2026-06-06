import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import os from 'os'
import { spawn } from 'child_process'

const OWNER = 'AmirAnsarpour'
const REPO = 'finely-app'

export interface UpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  downloadUrl: string | null
}

function fetchJson(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'Finely-Updater/1.0' } }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchJson(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`GitHub API returned HTTP ${res.statusCode}`))
        return
      }
      let raw = ''
      res.on('data', (chunk: Buffer) => { raw += chunk.toString() })
      res.on('end', () => {
        try { resolve(JSON.parse(raw) as Record<string, unknown>) }
        catch (e) { reject(e) }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => req.destroy(new Error('Request timed out')))
  })
}

function semverGt(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d > 0
  }
  return false
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = app.getVersion()
  const release = await fetchJson(
    `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`
  )
  const latest = String(release['tag_name'] ?? '').replace(/^v/, '')
  const hasUpdate = latest.length > 0 && semverGt(latest, current)

  let downloadUrl: string | null = null
  if (hasUpdate && process.platform === 'win32') {
    const assets = (release['assets'] as Array<Record<string, unknown>>) ?? []
    // Match only the portable artifact, not the NSIS setup installer
    const exe = assets.find(a => String(a['name']).includes('portable') && String(a['name']).endsWith('.exe'))
    downloadUrl = exe ? String(exe['browser_download_url']) : null
  }

  return { hasUpdate, latestVersion: latest, currentVersion: current, downloadUrl }
}

export function downloadUpdate(
  url: string,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const dest = join(os.tmpdir(), `finely-update-${Date.now()}.exe`)

    function get(dlUrl: string): void {
      const mod = dlUrl.startsWith('https') ? https : http
      mod.get(dlUrl, { headers: { 'User-Agent': 'Finely-Updater/1.0' } }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          get(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`))
          return
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        const out = fs.createWriteStream(dest)
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (total > 0) onProgress(Math.round((received / total) * 100))
        })
        res.pipe(out)
        out.on('finish', () => resolve(dest))
        out.on('error', reject)
        res.on('error', reject)
      }).on('error', reject)
    }

    get(url)
  })
}

// Launches a detached .bat that waits for this process to exit, replaces the
// exe in-place, starts it, then self-deletes. Works for portable builds where
// the user can run the exe from any location.
export function applyUpdateAndRestart(newExePath: string): void {
  const currentExe = process.execPath
  const pid = process.pid
  const bat = join(os.tmpdir(), `finely-updater-${Date.now()}.bat`)

  // tasklist /FI "PID eq N" | find "N" returns 0 while process is alive
  const script = [
    '@echo off',
    ':check',
    `tasklist /FI "PID eq ${pid}" 2>NUL | find "${pid}" >NUL 2>&1`,
    'if not errorlevel 1 (',
    '  timeout /t 1 /nobreak >nul',
    '  goto check',
    ')',
    'timeout /t 1 /nobreak >nul',
    ':move',
    `move /y "${newExePath}" "${currentExe}"`,
    'if errorlevel 1 (',
    '  timeout /t 1 /nobreak >nul',
    '  goto move',
    ')',
    `start "" "${currentExe}"`,
    'del "%~f0"'
  ].join('\r\n')

  fs.writeFileSync(bat, script, 'utf-8')

  spawn('cmd.exe', ['/c', bat], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref()

  app.quit()
}
