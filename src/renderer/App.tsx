import React, { useEffect, useState, useMemo } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Categories from './pages/Categories'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Installments from './pages/Installments'
import Goals from './pages/Goals'
import Investments from './pages/Investments'
import Accounts from './pages/Accounts'
import AIInsights from './pages/AIInsights'
import QuickAdd from './pages/QuickAdd'
import Modal from './components/Modal'
import TransactionForm from './pages/TransactionForm'
import { useData } from './hooks/useData'
import type { UseDataReturn } from './hooks/useData'
import { useAIAnalysis } from './hooks/useAIAnalysis'
import { ToastProvider, useToast } from './components/Toast'
import { CalendarProvider } from './utils/calendarContext'
import { CURRENCIES, formatCurrency } from './utils/formatters'
import { useCalendar } from './utils/calendarContext'
import { accountBalance } from './utils/accountBalance'
import { fileManager } from './utils/fileManager'
import VaultGate from './components/VaultGate'
import logoUrl from './assets/finely.png'
import './styles/globals.css'
import './styles/animations.css'
import './styles/components.css'
import './styles/pages.css'

// ── Onboarding ────────────────────────────────────────────
type OnboardStep = 'welcome' | 'currency' | 'folder' | 'security'
const ONBOARD_STEPS: OnboardStep[] = ['welcome', 'currency', 'folder', 'security']

function Onboarding({ data }: { data: UseDataReturn }) {
  const [step, setStep] = useState<OnboardStep>('welcome')
  const [currency, setCurrency] = useState('USD')
  const [folder, setFolder] = useState(data.settings.dataFolder || '')
  const [browsingFolder, setBrowsingFolder] = useState(false)
  const [wantsEncryption, setWantsEncryption] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [finishError, setFinishError] = useState('')
  const [finishing, setFinishing] = useState(false)

  useEffect(() => { setFolder(data.settings.dataFolder || '') }, [data.settings.dataFolder])

  const handleBrowseFolder = async () => {
    setBrowsingFolder(true)
    try {
      const picked = await data.selectFolder()
      if (picked) setFolder(picked)
    } finally {
      setBrowsingFolder(false)
    }
  }

  const handleFinish = async () => {
    setFinishError('')
    if (wantsEncryption) {
      if (passphrase.length < 8) { setFinishError('Passphrase must be at least 8 characters'); return }
      if (passphrase !== confirmPassphrase) { setFinishError('Passphrases do not match'); return }
    }
    setFinishing(true)
    try {
      if (folder && folder !== data.settings.dataFolder) {
        await data.updateSettings({ dataFolder: folder })
      }
      if (wantsEncryption) {
        await fileManager.vaultEnable(passphrase)
      }
      const cur = CURRENCIES.find(c => c.code === currency)!
      await data.updateSettings({
        currency: cur.code,
        currencySymbol: cur.symbol,
        currencyLocale: cur.locale,
        onboardingComplete: true
      })
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : 'Something went wrong finishing setup')
      setFinishing(false)
    }
  }

  const stepIndex = ONBOARD_STEPS.indexOf(step)

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <div className="onboarding__steps">
          {ONBOARD_STEPS.map((s, i) => (
            <span key={s} className={`onboarding__dot ${i <= stepIndex ? 'onboarding__dot--active' : ''}`} />
          ))}
        </div>

        {step === 'welcome' && (
          <>
            <img src={logoUrl} alt="Finely" className="onboarding__logo" />
            <h1 className="onboarding__title">Welcome to Finely</h1>
            <p className="onboarding__sub">
              Your personal income & expense tracker. Everything is stored locally on this device — nothing is sent anywhere unless you choose to.
            </p>
            <button className="onboarding__btn" onClick={() => setStep('currency')}>Get Started →</button>
          </>
        )}

        {step === 'currency' && (
          <>
            <h1 className="onboarding__title">Your Currency</h1>
            <p className="onboarding__sub">You can change this later in Settings.</p>
            <div className="onboarding__field">
              <label className="onboarding__label">Currency</label>
              <select
                className="onboarding__select"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div className="onboarding__row">
              <button className="btn-ghost" onClick={() => setStep('welcome')}>Back</button>
              <button className="onboarding__btn" onClick={() => setStep('folder')}>Continue →</button>
            </div>
          </>
        )}

        {step === 'folder' && (
          <>
            <h1 className="onboarding__title">Where to Store Your Data</h1>
            <p className="onboarding__sub">Plain JSON files, saved on this device. Point this at a Dropbox/Drive folder if you want it synced across your own devices.</p>
            <div className="onboarding__field">
              <p className="onboarding__folder-path">{folder || 'Default location'}</p>
              <button type="button" className="btn-ghost" onClick={handleBrowseFolder} disabled={browsingFolder}>
                {browsingFolder ? 'Selecting…' : 'Choose a Different Folder'}
              </button>
            </div>
            <div className="onboarding__row">
              <button className="btn-ghost" onClick={() => setStep('currency')}>Back</button>
              <button className="onboarding__btn" onClick={() => setStep('security')}>Continue →</button>
            </div>
          </>
        )}

        {step === 'security' && (
          <>
            <h1 className="onboarding__title">Encrypt Your Data</h1>
            <p className="onboarding__sub">Optional. Locks your data folder with a passphrase only you know — if you forget it, your data cannot be recovered.</p>
            <label className="rollover-toggle" style={{ width: '100%' }}>
              <span className="rollover-toggle__text">
                <span className="form-label" style={{ margin: 0 }}>Encrypt my data with a passphrase</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Recommended if this folder syncs to the cloud</span>
              </span>
              <input type="checkbox" checked={wantsEncryption} onChange={e => setWantsEncryption(e.target.checked)} style={{ display: 'none' }} />
              <span className={`rollover-toggle__switch ${wantsEncryption ? 'rollover-toggle__switch--on' : ''}`} />
            </label>
            {wantsEncryption && (
              <>
                <div className="onboarding__field">
                  <label className="onboarding__label">Passphrase</label>
                  <input type="password" className="form-input" value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="At least 8 characters" />
                </div>
                <div className="onboarding__field">
                  <label className="onboarding__label">Confirm Passphrase</label>
                  <input type="password" className="form-input" value={confirmPassphrase} onChange={e => setConfirmPassphrase(e.target.value)} />
                </div>
              </>
            )}
            {finishError && <p className="form-error">{finishError}</p>}
            <div className="onboarding__row">
              <button className="btn-ghost" onClick={() => setStep('folder')}>Back</button>
              <button className="onboarding__btn" onClick={handleFinish} disabled={finishing}>
                {finishing ? 'Finishing…' : 'Finish'}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`
        .onboarding {
          position: fixed; inset: 0; z-index: 200;
          display: flex; align-items: center; justify-content: center;
          background: #000;
        }
        .onboarding__card {
          display: flex; flex-direction: column; align-items: center;
          gap: 18px; max-width: 400px; width: 100%; padding: 40px 36px;
          background: var(--glass-bg); backdrop-filter: blur(40px);
          border: 1px solid var(--glass-border); border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-glass);
          animation: scaleIn 0.35s var(--ease-spring) both;
        }
        .onboarding__steps { display: flex; gap: 6px; }
        .onboarding__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--glass-border); transition: background var(--transition); }
        .onboarding__dot--active { background: var(--accent); }
        .onboarding__logo { width: 72px; height: 72px; object-fit: contain; border-radius: 18px; }
        .onboarding__title {
          font-size: 24px; font-weight: 700; letter-spacing: -0.5px; text-align: center;
          background: linear-gradient(135deg, #e8eaff, rgba(255,255,255,0.7));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .onboarding__sub { font-size: 14px; color: var(--text-secondary); text-align: center; line-height: 1.6; }
        .onboarding__field { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .onboarding__label { font-size: 12px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
        .onboarding__select { width: 100%; font-size: 14px; }
        .onboarding__folder-path { font-size: 12px; color: var(--text-secondary); background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 10px 12px; width: 100%; word-break: break-all; margin: 0 0 10px; }
        .onboarding__row { display: flex; gap: 10px; width: 100%; }
        .onboarding__row .btn-ghost { flex: 1; text-align: center; justify-content: center; }
        .onboarding__row .onboarding__btn { flex: 2; }
        .onboarding__btn {
          width: 100%; padding: 13px 24px; border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--accent), #a78bfa);
          color: white; font-size: 15px; font-weight: 700; border: none;
          cursor: pointer; transition: all var(--transition-spring);
          box-shadow: 0 6px 24px var(--accent-glow); margin-top: 4px;
        }
        .onboarding__btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 32px var(--accent-glow); }
        .onboarding__btn:active:not(:disabled) { transform: scale(0.98); }
        .onboarding__btn:disabled { opacity: 0.6; cursor: default; }
      `}</style>
    </div>
  )
}

// ── Unsaved-changes confirm overlay inside modal ──────────
function CloseConfirm({ onDiscard, onKeep }: { onDiscard: () => void; onKeep: () => void }) {
  return (
    <div className="close-confirm">
      <p className="close-confirm__msg">You have unsaved changes. Discard them?</p>
      <div className="close-confirm__actions">
        <button className="btn-ghost" onClick={onKeep}>Keep Editing</button>
        <button className="btn-danger" onClick={onDiscard}>Discard</button>
      </div>
      <style>{`
        .close-confirm { padding: 4px 0 8px; display: flex; flex-direction: column; gap: 16px; }
        .close-confirm__msg { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }
        .close-confirm__actions { display: flex; gap: 10px; justify-content: flex-end; }
        .btn-ghost { padding: 9px 18px; border-radius: var(--radius-md); background: var(--glass-bg); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid var(--glass-border); transition: all var(--transition); }
        .btn-ghost:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .btn-danger { padding: 9px 18px; border-radius: var(--radius-md); background: var(--expense-dim); color: var(--expense); font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid rgba(248,113,113,0.3); transition: all var(--transition); }
        .btn-danger:hover { background: rgba(248,113,113,0.2); }
      `}</style>
    </div>
  )
}

// ── Routed pages — rendered inside CalendarProvider so useAIAnalysis can
// pull calendar-aware month helpers (Jalali-aware, not just Gregorian) ────
function AppRoutes({ data }: { data: UseDataReturn }) {
  const { getLast6Months, getMonthKey, getMonthLabel, currentMonthKey } = useCalendar()
  const aiData = useAIAnalysis({
    transactions: data.transactions,
    categories: data.categories,
    settings: data.settings,
    getLast6Months, getMonthKey, getMonthLabel, currentMonthKey,
  })

  return (
    <Routes>
      <Route path="/" element={<Dashboard data={data} />} />
      <Route path="/transactions" element={<Transactions data={data} />} />
      <Route path="/categories" element={<Categories data={data} />} />
      <Route path="/reports" element={<Reports data={data} />} />
      <Route path="/settings" element={<Settings data={data} aiData={aiData} />} />
      <Route path="/installments" element={<Installments data={data} />} />
      <Route path="/goals" element={<Goals data={data} />} />
      <Route path="/investments" element={<Investments data={data} />} />
      <Route path="/accounts" element={<Accounts data={data} />} />
      <Route path="/ai-insights" element={<AIInsights data={data} aiData={aiData} />} />
    </Routes>
  )
}

// ── Main app shell ────────────────────────────────────────
function AppShell() {
  const data = useData()
  const { toast } = useToast()
  const { getMonthKey, currentMonthKey } = useCalendar()
  const [showAddModal, setShowAddModal] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Apply theme
  useEffect(() => {
    applyTheme(data.settings.theme)
  }, [data.settings.theme])

  // Installments due within 7 days
  const installmentAlertCount = useMemo(() => {
    const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00')
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(today.getDate() + 7)
    return data.installments.filter(inst =>
      inst.payments.some(p => {
        if (p.isPaid) return false
        const due = new Date(p.dueDate + 'T00:00:00')
        return due >= today && due <= sevenDaysLater
      })
    ).length
  }, [data.installments])

  // Budget alert count: categories at ≥80% of their monthly budget
  const budgetAlertCount = useMemo(() => {
    const month = currentMonthKey()
    return data.categories
      .filter(c => c.type === 'expense' && c.budget && c.budget > 0)
      .filter(c => {
        const spent = data.transactions
          .filter(t => t.type === 'expense' && t.category === c.id && getMonthKey(t.date) === month)
          .reduce((s, t) => s + t.amount, 0)
        return spent >= c.budget! * 0.8
      }).length
  }, [data.categories, data.transactions, getMonthKey, currentMonthKey])

  // Live balance near the tray icon — opt-in, off by default (see Settings).
  // Shows as menu bar title text on macOS, as the hover tooltip elsewhere
  // (tray.ts picks the right one; this effect just pushes the text).
  const totalBalance = useMemo(
    () => data.accounts.reduce((s, a) => s + accountBalance(data.transactions, a.id), 0),
    [data.accounts, data.transactions]
  )
  useEffect(() => {
    if (!data.settings.showMenuBarBalance) {
      fileManager.setTrayBalance('')
      return
    }
    const sign = totalBalance < 0 ? '−' : ''
    fileManager.setTrayBalance(`${sign}${formatCurrency(totalBalance, data.settings.currencySymbol, data.settings.currencyLocale)}`)
  }, [data.settings.showMenuBarBalance, data.settings.currencySymbol, data.settings.currencyLocale, totalBalance])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowAddModal(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleRequestClose() {
    if (formDirty) setShowCloseConfirm(true)
    else closeAddModal()
  }

  function closeAddModal() {
    setShowAddModal(false)
    setFormDirty(false)
    setShowCloseConfirm(false)
  }

  // Onboarding
  if (!data.loading && !data.settings.onboardingComplete) {
    return <Onboarding data={data} />
  }

  if (data.loading) {
    return (
      <div className="splash">
        <div className="splash-inner">
          <img src={logoUrl} alt="Finely" className="splash-logo-img" />
          <p className="splash-name">Finely</p>
          <div className="spinner" />
        </div>
        <style>{`
          .splash { display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; }
          .splash-inner { display: flex; flex-direction: column; align-items: center; gap: 14px; }
          .splash-logo-img { width: 64px; height: 64px; object-fit: contain; border-radius: 14px; }
          .splash-name { font-size: 22px; font-weight: 700; background: linear-gradient(135deg, var(--accent), #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        `}</style>
      </div>
    )
  }

  if (data.error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, color: 'var(--expense)' }}>
        <p>Failed to load data: {data.error}</p>
        <button onClick={data.refreshData} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <CalendarProvider settings={data.settings}>
    <div className="app-layout">
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      <Sidebar onOpenAdd={() => setShowAddModal(true)} budgetAlertCount={budgetAlertCount} installmentAlertCount={installmentAlertCount} />

      <main className="main-content">
        {/* Lets the window be dragged from anywhere along the top edge, not
            just above the sidebar — sits in the existing empty top padding,
            so it never overlaps page content or header buttons. */}
        <div className="titlebar-drag-strip" />
        <AppRoutes data={data} />
      </main>

      {/* Global add transaction modal */}
      <Modal open={showAddModal} onClose={handleRequestClose} title="Add Transaction">
        {showCloseConfirm ? (
          <CloseConfirm onDiscard={closeAddModal} onKeep={() => setShowCloseConfirm(false)} />
        ) : (
          <TransactionForm
            categories={data.categories}
            accounts={data.accounts}
            settings={data.settings}
            transactions={data.transactions}
            onDirtyChange={setFormDirty}
            onSave={async (tx) => {
              await data.addTransaction(tx)
              toast('Transaction added')
              closeAddModal()
            }}
            onCancel={handleRequestClose}
          />
        )}
      </Modal>

      <style>{`
        .app-layout { display: flex; height: 100vh; overflow: hidden; position: relative; }
        .main-content {
          flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
          position: relative; z-index: 1; padding: 28px 28px 40px;
        }
        .titlebar-drag-strip {
          position: absolute; top: 0; left: 0; right: 0; height: 28px;
          -webkit-app-region: drag; z-index: 0;
        }
        .page { max-width: 1400px; margin: 0 auto; }
      `}</style>
    </div>
    </CalendarProvider>
  )
}

export default function App() {
  return (
    <VaultGate>
      <Routes>
        <Route path="/quick-add" element={<QuickAdd />} />
        <Route path="/*" element={<ToastProvider><AppShell /></ToastProvider>} />
      </Routes>
    </VaultGate>
  )
}

export function applyTheme(theme: 'light' | 'dark' | 'black' | 'system') {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  document.documentElement.setAttribute('data-theme', resolved)
}
