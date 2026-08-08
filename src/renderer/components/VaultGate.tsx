import React, { useState, useEffect, useRef } from 'react'
import { Lock, Fingerprint } from 'lucide-react'
import { fileManager } from '../utils/fileManager'
import logoUrl from '../assets/finely.png'

const isMac = window.electronAPI.platform === 'darwin'
const osUnlockLabel = isMac ? 'Try Touch ID' : 'Try again'

// Gates the entire renderer tree (both the main window and the Quick Add
// popup, since they share one main-process vault state) behind a passphrase
// prompt whenever the current data folder has encryption enabled. A no-op
// pass-through for everyone who never turns encryption on. If OS-unlock is
// enabled (see Settings → Data Encryption), tries that first — silently on
// mount, and again via a retry button if it was cancelled or failed.
export default function VaultGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking')
  const [osUnlockEnabled, setOsUnlockEnabled] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const attempted = useRef(false)

  useEffect(() => {
    fileManager.vaultStatus().then(async s => {
      if (!s.exists) { setStatus('unlocked'); return }
      if (s.unlocked) { setStatus('unlocked'); return }
      setOsUnlockEnabled(s.osUnlockEnabled)
      if (s.osUnlockEnabled && !attempted.current) {
        attempted.current = true
        const result = await fileManager.vaultTryOsUnlock()
        if (result.ok) { setStatus('unlocked'); return }
        if (result.reason) setError(result.reason)
      }
      setStatus('locked')
    })
  }, [])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passphrase || unlocking) return
    setUnlocking(true)
    setError('')
    try {
      const ok = await fileManager.vaultUnlock(passphrase)
      if (ok) {
        setStatus('unlocked')
        setPassphrase('')
      } else {
        setError('Incorrect passphrase')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong unlocking')
    } finally {
      setUnlocking(false)
    }
  }

  const handleTryOsUnlock = async () => {
    setUnlocking(true)
    setError('')
    try {
      const result = await fileManager.vaultTryOsUnlock()
      if (result.ok) setStatus('unlocked')
      else setError(result.reason || (isMac ? 'Touch ID failed or was cancelled' : 'Automatic unlock failed'))
    } finally {
      setUnlocking(false)
    }
  }

  if (status === 'checking') return null

  if (status === 'locked') {
    return (
      <div className="vault-lock">
        <form className="vault-lock__card" onSubmit={handleUnlock}>
          <div className="vault-lock__icon"><Lock size={20} /></div>
          <img src={logoUrl} alt="Finely" className="vault-lock__logo" />
          <h1 className="vault-lock__title">Finely is locked</h1>
          <p className="vault-lock__sub">Enter your passphrase to decrypt your data.</p>
          <input
            type="password"
            className="form-input vault-lock__input"
            placeholder="Passphrase"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            autoFocus
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="vault-lock__btn" disabled={unlocking || !passphrase}>
            {unlocking ? 'Unlocking…' : 'Unlock'}
          </button>
          {osUnlockEnabled && (
            <button type="button" className="vault-lock__os-btn" onClick={handleTryOsUnlock} disabled={unlocking}>
              <Fingerprint size={14} /> {osUnlockLabel}
            </button>
          )}
        </form>
        <style>{`
          .vault-lock {
            position: fixed; inset: 0; z-index: 300;
            display: flex; align-items: center; justify-content: center;
            background: #000;
          }
          .vault-lock__card {
            display: flex; flex-direction: column; align-items: center;
            gap: 14px; max-width: 360px; width: 100%; padding: 40px 36px;
            background: var(--glass-bg); backdrop-filter: blur(40px);
            border: 1px solid var(--glass-border); border-radius: var(--radius-2xl);
            box-shadow: var(--shadow-glass);
            animation: scaleIn 0.35s var(--ease-spring) both;
          }
          .vault-lock__icon {
            width: 40px; height: 40px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            background: var(--accent-dim); color: var(--accent); margin-bottom: 2px;
          }
          .vault-lock__logo { width: 48px; height: 48px; object-fit: contain; border-radius: 12px; }
          .vault-lock__title { font-size: 20px; font-weight: 700; }
          .vault-lock__sub { font-size: 13px; color: var(--text-secondary); text-align: center; line-height: 1.6; margin-top: -6px; }
          .vault-lock__input { width: 100%; text-align: center; }
          .vault-lock__btn {
            width: 100%; padding: 12px 24px; border-radius: var(--radius-md);
            background: linear-gradient(135deg, var(--accent), #a78bfa);
            color: white; font-size: 14px; font-weight: 700; border: none;
            cursor: pointer; transition: all var(--transition-spring);
            box-shadow: 0 6px 24px var(--accent-glow);
          }
          .vault-lock__btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 32px var(--accent-glow); }
          .vault-lock__btn:disabled { opacity: 0.55; cursor: default; }
          .vault-lock__os-btn {
            display: flex; align-items: center; justify-content: center; gap: 6px;
            width: 100%; padding: 9px 24px; border-radius: var(--radius-md);
            background: transparent; border: 1px solid var(--glass-border);
            color: var(--text-secondary); font-size: 13px; font-weight: 500;
            cursor: pointer; transition: all var(--transition);
          }
          .vault-lock__os-btn:hover:not(:disabled) { background: var(--glass-bg-hover); color: var(--text-primary); }
          .vault-lock__os-btn:disabled { opacity: 0.55; cursor: default; }
        `}</style>
      </div>
    )
  }

  return <>{children}</>
}
