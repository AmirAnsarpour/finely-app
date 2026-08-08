import { app, safeStorage, systemPreferences } from 'electron'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Optional, opt-in encryption for the data folder. Off by default — plain
// JSON files are untouched unless the user explicitly sets a passphrase.
// The passphrase itself is never stored anywhere; only a salt + a small
// "verifier" ciphertext (used to check a passphrase is correct) live in
// `.finely-vault.json`, alongside the encrypted data files, so the whole
// folder — vault metadata included — travels together when synced or
// backed up. Forgetting the passphrase means the data cannot be recovered;
// there is no key escrow.

const VAULT_FILE = '.finely-vault.json'
const VERIFIER_PLAINTEXT = 'finely-vault-ok'

// Optional convenience layer on top of the passphrase: wraps the already-
// derived vault key with the OS's own secure storage (Keychain / DPAPI /
// libsecret — the same mechanism the AI key uses) so the app can unlock
// itself once the user is signed into their OS account, instead of asking
// for the passphrase again every launch. This is machine-local (userData,
// never the synced data folder) and strictly weaker than the passphrase —
// anyone signed into this OS account can then open the data too, so it's
// opt-in and off by default.
const OS_KEY_PATH = path.join(app.getPath('userData'), 'finely-vault-oskey.enc')

interface VaultMeta {
  version: 1
  salt: string
  verifierIv: string
  verifierTag: string
  verifierData: string
}

interface Envelope {
  __finelyVault: 1
  iv: string
  tag: string
  data: string
}

// The derived key lives only in main-process memory for the life of the
// app (or until locked) — never written to disk, never sent to the renderer.
let cachedKey: Buffer | null = null
let cachedFolder: string | null = null

function vaultMetaPath(dataFolder: string): string {
  return path.join(dataFolder, VAULT_FILE)
}

export function vaultExists(dataFolder: string): boolean {
  return fs.existsSync(vaultMetaPath(dataFolder))
}

export function isUnlocked(dataFolder: string): boolean {
  return cachedKey !== null && cachedFolder === dataFolder
}

function readMeta(dataFolder: string): VaultMeta {
  return JSON.parse(fs.readFileSync(vaultMetaPath(dataFolder), 'utf-8'))
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32)
}

function encryptWithKey(key: Buffer, plaintext: string): { iv: string; tag: string; data: string } {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: enc.toString('base64') }
}

function decryptWithKey(key: Buffer, iv: string, tag: string, data: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()])
  return dec.toString('utf-8')
}

function isEnvelope(v: unknown): v is Envelope {
  return !!v && typeof v === 'object' && (v as Record<string, unknown>).__finelyVault === 1
}

export function unlock(dataFolder: string, passphrase: string): boolean {
  const meta = readMeta(dataFolder)
  const key = deriveKey(passphrase, Buffer.from(meta.salt, 'base64'))
  try {
    if (decryptWithKey(key, meta.verifierIv, meta.verifierTag, meta.verifierData) !== VERIFIER_PLAINTEXT) return false
  } catch {
    return false // wrong passphrase — GCM auth tag check failed
  }
  cachedKey = key
  cachedFolder = dataFolder
  return true
}

export function lock(): void {
  cachedKey = null
  cachedFolder = null
}

// Turns encryption on: derives a fresh key, re-encrypts every existing
// plaintext data file in place, then writes the vault marker last — so a
// crash mid-way never leaves a vault marker with files it can't decrypt.
export function enable(dataFolder: string, passphrase: string, fileNames: string[]): void {
  const salt = crypto.randomBytes(16)
  const key = deriveKey(passphrase, salt)

  for (const name of fileNames) {
    const fp = path.join(dataFolder, name)
    if (!fs.existsSync(fp)) continue
    const raw = fs.readFileSync(fp, 'utf-8')
    const enc = encryptWithKey(key, raw)
    const envelope: Envelope = { __finelyVault: 1, ...enc }
    fs.writeFileSync(fp, JSON.stringify(envelope), 'utf-8')
  }

  const verifier = encryptWithKey(key, VERIFIER_PLAINTEXT)
  const meta: VaultMeta = { version: 1, salt: salt.toString('base64'), verifierIv: verifier.iv, verifierTag: verifier.tag, verifierData: verifier.data }
  fs.writeFileSync(vaultMetaPath(dataFolder), JSON.stringify(meta), 'utf-8')

  cachedKey = key
  cachedFolder = dataFolder
}

export function disable(dataFolder: string, fileNames: string[]): void {
  if (!isUnlocked(dataFolder)) throw new Error('Vault is locked')
  const key = cachedKey!

  for (const name of fileNames) {
    const fp = path.join(dataFolder, name)
    if (!fs.existsSync(fp)) continue
    const raw = fs.readFileSync(fp, 'utf-8')
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { continue }
    if (!isEnvelope(parsed)) continue
    fs.writeFileSync(fp, decryptWithKey(key, parsed.iv, parsed.tag, parsed.data), 'utf-8')
  }

  fs.unlinkSync(vaultMetaPath(dataFolder))
  disableOsUnlock()
  lock()
}

export function changePassphrase(dataFolder: string, newPassphrase: string, fileNames: string[]): void {
  if (!isUnlocked(dataFolder)) throw new Error('Vault is locked')
  const oldKey = cachedKey!
  const salt = crypto.randomBytes(16)
  const newKey = deriveKey(newPassphrase, salt)

  for (const name of fileNames) {
    const fp = path.join(dataFolder, name)
    if (!fs.existsSync(fp)) continue
    const raw = fs.readFileSync(fp, 'utf-8')
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { continue }
    if (!isEnvelope(parsed)) continue
    const plain = decryptWithKey(oldKey, parsed.iv, parsed.tag, parsed.data)
    const enc = encryptWithKey(newKey, plain)
    fs.writeFileSync(fp, JSON.stringify({ __finelyVault: 1, ...enc } as Envelope), 'utf-8')
  }

  const verifier = encryptWithKey(newKey, VERIFIER_PLAINTEXT)
  const meta: VaultMeta = { version: 1, salt: salt.toString('base64'), verifierIv: verifier.iv, verifierTag: verifier.tag, verifierData: verifier.data }
  fs.writeFileSync(vaultMetaPath(dataFolder), JSON.stringify(meta), 'utf-8')

  cachedKey = newKey
  cachedFolder = dataFolder
  // The previously wrapped key is now stale — re-wrap with the new one
  // (no fresh Touch ID prompt; the passphrase change itself was the consent
  // step) so OS-unlock keeps working instead of silently breaking later.
  if (osUnlockEnabled()) wrapKeyForOs(dataFolder, newKey)
}

// ── OS-backed unlock (Touch ID / signed-in OS account) ─────────────────────

export function osUnlockAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export function osUnlockEnabled(): boolean {
  return fs.existsSync(OS_KEY_PATH)
}

function wrapKeyForOs(dataFolder: string, key: Buffer): void {
  const packed = JSON.stringify({ folder: dataFolder, key: key.toString('base64') })
  fs.writeFileSync(OS_KEY_PATH, safeStorage.encryptString(packed))
}

// Wraps the currently-unlocked vault key with the OS keystore. On macOS,
// asks for Touch ID first (when available) so the user gets immediate
// confirmation it actually works, rather than discovering it fails at the
// next launch — if that's declined or fails, the toggle doesn't get enabled.
export async function enableOsUnlock(dataFolder: string): Promise<void> {
  if (!isUnlocked(dataFolder)) throw new Error('Vault is locked')
  if (!safeStorage.isEncryptionAvailable()) throw new Error('OS-level secure storage is not available on this device')

  if (process.platform === 'darwin' && systemPreferences.canPromptTouchID?.()) {
    try {
      await systemPreferences.promptTouchID('enable Touch ID unlock for Finely')
    } catch {
      throw new Error('Touch ID confirmation failed or was cancelled')
    }
  }

  wrapKeyForOs(dataFolder, cachedKey!)
}

export function disableOsUnlock(): void {
  if (fs.existsSync(OS_KEY_PATH)) fs.unlinkSync(OS_KEY_PATH)
}

export interface OsUnlockResult {
  ok: boolean
  reason?: string // the underlying error, for diagnosing why it failed — never shown as the only option, just alongside the passphrase fallback
}

// Attempts to recover the vault key without a passphrase. Never throws —
// callers can always fall back to the normal passphrase prompt. Short-
// circuits if another window (e.g. the main window and the Quick Add popup,
// which each run their own copy of this check) already unlocked it, so it
// doesn't prompt Touch ID twice for one unlock.
export async function tryOsUnlock(dataFolder: string): Promise<OsUnlockResult> {
  if (isUnlocked(dataFolder)) return { ok: true }
  if (!fs.existsSync(OS_KEY_PATH)) return { ok: false, reason: 'OS-unlock is not set up for this data folder' }
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, reason: 'OS-level secure storage is not available on this device' }

  if (process.platform === 'darwin' && systemPreferences.canPromptTouchID?.()) {
    try {
      await systemPreferences.promptTouchID('unlock your Finely data')
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : String(e) }
    }
  }

  try {
    const packed = JSON.parse(safeStorage.decryptString(fs.readFileSync(OS_KEY_PATH)))
    if (packed.folder !== dataFolder) return { ok: false, reason: 'Saved OS-unlock key belongs to a different data folder' }
    const key = Buffer.from(packed.key, 'base64')
    const meta = readMeta(dataFolder)
    if (decryptWithKey(key, meta.verifierIv, meta.verifierTag, meta.verifierData) !== VERIFIER_PLAINTEXT) {
      return { ok: false, reason: 'Recovered key did not match this vault' }
    }
    cachedKey = key
    cachedFolder = dataFolder
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

// Used by the write-data IPC handler once the caller has already checked
// vaultExists() — throws if somehow called while locked rather than
// silently writing plaintext under a vault marker.
export function encryptForWrite(dataFolder: string, plaintext: string): string {
  if (!isUnlocked(dataFolder)) throw new Error('[vault-locked] Vault is locked')
  const enc = encryptWithKey(cachedKey!, plaintext)
  return JSON.stringify({ __finelyVault: 1, ...enc } as Envelope)
}

// Used by the read-data IPC handler on every read — a no-op passthrough for
// files that were never encrypted, so it's always safe to call regardless
// of whether a vault is configured.
export function decryptForRead(dataFolder: string, raw: string): string {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return raw }
  if (!isEnvelope(parsed)) return raw
  if (!isUnlocked(dataFolder)) throw new Error('[vault-locked] Vault is locked')
  return decryptWithKey(cachedKey!, parsed.iv, parsed.tag, parsed.data)
}
