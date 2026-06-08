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
import Modal from './components/Modal'
import TransactionForm from './pages/TransactionForm'
import { useData } from './hooks/useData'
import { ToastProvider, useToast } from './components/Toast'
import { CalendarProvider } from './utils/calendarContext'
import { CURRENCIES } from './utils/formatters'
import { useCalendar } from './utils/calendarContext'
import logoUrl from './assets/finely.png'
import './styles/globals.css'
import './styles/animations.css'
import './styles/components.css'
import './styles/pages.css'

// ── Onboarding ────────────────────────────────────────────
function Onboarding({ onComplete }: { onComplete: (currency: string) => void }) {
  const [currency, setCurrency] = useState('USD')
  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <img src={logoUrl} alt="Finely" className="onboarding__logo" />
        <h1 className="onboarding__title">Welcome to Finely</h1>
        <p className="onboarding__sub">Your personal income & expense tracker. Let's start with one quick choice.</p>
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
        <button className="onboarding__btn" onClick={() => onComplete(currency)}>
          Get Started →
        </button>
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
        .onboarding__logo { width: 72px; height: 72px; object-fit: contain; border-radius: 18px; }
        .onboarding__title {
          font-size: 26px; font-weight: 700; letter-spacing: -0.5px;
          background: linear-gradient(135deg, #e8eaff, rgba(255,255,255,0.7));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .onboarding__sub { font-size: 14px; color: var(--text-secondary); text-align: center; line-height: 1.6; }
        .onboarding__field { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .onboarding__label { font-size: 12px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
        .onboarding__select { width: 100%; font-size: 14px; }
        .onboarding__btn {
          width: 100%; padding: 13px 24px; border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--accent), #a78bfa);
          color: white; font-size: 15px; font-weight: 700; border: none;
          cursor: pointer; transition: all var(--transition-spring);
          box-shadow: 0 6px 24px var(--accent-glow); margin-top: 4px;
        }
        .onboarding__btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px var(--accent-glow); }
        .onboarding__btn:active { transform: scale(0.98); }
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

  // Ctrl+N shortcut
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
    return (
      <Onboarding
        onComplete={async (code) => {
          const cur = CURRENCIES.find(c => c.code === code)!
          await data.updateSettings({
            currency: cur.code,
            currencySymbol: cur.symbol,
            currencyLocale: cur.locale,
            onboardingComplete: true
          })
        }}
      />
    )
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
        <Routes>
          <Route path="/" element={<Dashboard data={data} />} />
          <Route path="/transactions" element={<Transactions data={data} />} />
          <Route path="/categories" element={<Categories data={data} />} />
          <Route path="/reports" element={<Reports data={data} />} />
          <Route path="/settings" element={<Settings data={data} />} />
          <Route path="/installments" element={<Installments data={data} />} />
          <Route path="/goals" element={<Goals data={data} />} />
          <Route path="/investments" element={<Investments data={data} />} />
        </Routes>
      </main>

      {/* Global add transaction modal */}
      <Modal open={showAddModal} onClose={handleRequestClose} title="Add Transaction">
        {showCloseConfirm ? (
          <CloseConfirm onDiscard={closeAddModal} onKeep={() => setShowCloseConfirm(false)} />
        ) : (
          <TransactionForm
            categories={data.categories}
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
        .page { max-width: 1400px; margin: 0 auto; }
      `}</style>
    </div>
    </CalendarProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}

export function applyTheme(theme: 'light' | 'dark' | 'black' | 'system') {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  document.documentElement.setAttribute('data-theme', resolved)
}
