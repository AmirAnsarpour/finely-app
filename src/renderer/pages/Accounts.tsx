import React, { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Wallet, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import CategoryIcon, { AVAILABLE_ICONS } from '../components/CategoryIcon'
import ColorPicker, { DEFAULT_COLOR_PRESETS } from '../components/ColorPicker'
import type { Account } from '../types'
import type { UseDataReturn } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../utils/formatters'
import { accountBalance } from '../utils/accountBalance'

interface Props { data: UseDataReturn }

// ── AccountForm ───────────────────────────────────────────────

function AccountForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Account
  onSave: (a: Omit<Account, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName]   = useState(initial?.name  ?? '')
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR_PRESETS[0])
  const [icon, setIcon]   = useState(initial?.icon  ?? 'wallet')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), color, icon })
    } finally {
      setSaving(false)
    }
  }

  // Show a curated subset of icons most relevant for accounts
  const ACCOUNT_ICONS = ['wallet', 'banknote', 'piggy-bank', 'coins', 'briefcase', 'home', 'dollar-sign', 'trending-up', 'gem', 'bitcoin']
  const icons = AVAILABLE_ICONS.filter(ic => ACCOUNT_ICONS.includes(ic))

  return (
    <form onSubmit={handleSubmit} className="cat-form">
      <div className="form-group">
        <label className="form-label">Account Name</label>
        <input
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Main Card, Cash, Savings…"
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="form-group">
        <label className="form-label">Icon</label>
        <div className="icon-grid">
          {icons.map(ic => (
            <button
              key={ic}
              type="button"
              className={`icon-btn ${icon === ic ? 'icon-btn--active' : ''}`}
              onClick={() => setIcon(ic)}
              title={ic}
            >
              <CategoryIcon icon={ic} color={icon === ic ? color : 'var(--text-muted)'} size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className="cat-preview">
        <CategoryIcon icon={icon} color={color} size={18} showBg bgSize={40} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{name || 'Preview'}</span>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Account'}
        </button>
      </div>
    </form>
  )
}

// ── AccountCard ───────────────────────────────────────────────

function AccountCard({
  account,
  balance,
  totalIncome,
  totalExpenses,
  txCount,
  fmt,
  onEdit,
  onDelete,
}: {
  account: Account
  balance: number
  totalIncome: number
  totalExpenses: number
  txCount: number
  fmt: (n: number) => string
  onEdit: () => void
  onDelete: () => void
}) {
  const isPositive = balance >= 0

  return (
    <GlassCard className="acc-card card-appear" hover>
      <div className="acc-card__accent" style={{ background: account.color }} />
      <div className="acc-card__body">
        <div className="acc-card__top">
          <CategoryIcon icon={account.icon} color={account.color} size={17} showBg bgSize={42} />
          <div className="acc-card__meta">
            <h3 className="acc-card__name">{account.name}</h3>
            <p className="acc-card__sub">{txCount} transaction{txCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="acc-card__actions">
            <button className="icon-action" onClick={onEdit} title="Edit">
              <Pencil size={13} />
            </button>
            <button className="icon-action icon-action--danger" onClick={onDelete} title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="acc-card__balance">
          <span className="acc-card__balance-label">Balance</span>
          <span className="acc-card__balance-value" style={{ color: isPositive ? 'var(--income)' : 'var(--expense)' }}>
            {balance < 0 ? '−' : ''}{fmt(Math.abs(balance))}
          </span>
        </div>

        <div className="acc-card__stats">
          <div className="acc-card__stat">
            <div className="acc-card__stat-icon" style={{ background: 'var(--income-dim)' }}>
              <TrendingUp size={12} color="var(--income)" />
            </div>
            <div>
              <div className="acc-card__stat-label">Income</div>
              <div className="acc-card__stat-value" style={{ color: 'var(--income)' }}>{fmt(totalIncome)}</div>
            </div>
          </div>
          <div className="acc-card__stat-divider" />
          <div className="acc-card__stat">
            <div className="acc-card__stat-icon" style={{ background: 'var(--expense-dim)' }}>
              <TrendingDown size={12} color="var(--expense)" />
            </div>
            <div>
              <div className="acc-card__stat-label">Expenses</div>
              <div className="acc-card__stat-value" style={{ color: 'var(--expense)' }}>{fmt(totalExpenses)}</div>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function Accounts({ data }: Props) {
  const { accounts, transactions, settings, addAccount, updateAccount, deleteAccount } = data
  const { toast } = useToast()

  const [showModal, setShowModal]         = useState(false)
  const [editAcc, setEditAcc]             = useState<Account | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fmt = (n: number) => formatCurrency(n, settings.currencySymbol, settings.currencyLocale)

  // Compute per-account stats from transactions
  const accountStats = useMemo(() => {
    return accounts.map(acc => {
      const accTx = transactions.filter(t => t.accountId === acc.id)
      const totalIncome   = accTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const totalExpenses = accTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const txCount = transactions.filter(t => t.accountId === acc.id || t.toAccountId === acc.id).length
      const balance = accountBalance(transactions, acc.id)
      return { ...acc, balance, totalIncome, totalExpenses, txCount }
    })
  }, [accounts, transactions])

  const totalBalance = accountStats.reduce((s, a) => s + a.balance, 0)
  const unassignedCount = transactions.filter(t => !t.accountId).length

  const handleSave = async (fields: Omit<Account, 'id' | 'createdAt'>) => {
    if (editAcc) {
      await updateAccount(editAcc.id, fields)
      toast('Account updated')
    } else {
      await addAccount(fields)
      toast('Account added')
    }
    setShowModal(false)
    setEditAcc(null)
  }

  const confirmDeleteAccount = async () => {
    if (!confirmDelete) return
    await deleteAccount(confirmDelete)
    setConfirmDelete(null)
    toast('Account deleted', 'info')
  }

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-sub">Manage your bank cards, wallets, and cash accounts</p>
        </div>
        <button className="btn-add" onClick={() => { setEditAcc(null); setShowModal(true) }}>
          <Plus size={14} /> Add Account
        </button>
      </div>

      {/* Summary strip */}
      {accounts.length > 0 && (
        <GlassCard className="card-appear" style={{ marginBottom: 16 }}>
          <div className="nw-strip">
            <div className="nw-col">
              <span className="nw-label">Accounts</span>
              <span className="nw-value">{accounts.length}</span>
            </div>
            <div className="nw-divider" />
            <div className="nw-col">
              <span className="nw-label">Total Balance</span>
              <span className="nw-value" style={{ color: totalBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {totalBalance < 0 ? '−' : ''}{fmt(Math.abs(totalBalance))}
              </span>
            </div>
            <div className="nw-divider" />
            <div className="nw-col">
              <span className="nw-label">Total Income</span>
              <span className="nw-value" style={{ color: 'var(--income)' }}>
                {fmt(accountStats.reduce((s, a) => s + a.totalIncome, 0))}
              </span>
            </div>
            <div className="nw-divider" />
            <div className="nw-col">
              <span className="nw-label">Total Expenses</span>
              <span className="nw-value" style={{ color: 'var(--expense)' }}>
                {fmt(accountStats.reduce((s, a) => s + a.totalExpenses, 0))}
              </span>
            </div>
            {unassignedCount > 0 && (
              <>
                <div className="nw-divider" />
                <div className="nw-col">
                  <span className="nw-label">Unassigned Tx</span>
                  <span className="nw-value" style={{ color: 'var(--text-muted)' }}>{unassignedCount}</span>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      )}

      {accounts.length === 0 ? (
        <GlassCard className="card-appear goals-empty">
          <div className="goals-empty-ring">
            <Wallet size={26} color="var(--accent)" />
          </div>
          <p className="goals-empty-title">No accounts yet</p>
          <p className="goals-empty-sub">
            Create your first account — a bank card, cash wallet, or savings account.
            You'll be able to assign transactions to accounts and track each balance separately.
          </p>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Add your first account
          </button>
        </GlassCard>
      ) : (
        <div className="acc-grid">
          {accountStats.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              balance={acc.balance}
              totalIncome={acc.totalIncome}
              totalExpenses={acc.totalExpenses}
              txCount={acc.txCount}
              fmt={fmt}
              onEdit={() => { setEditAcc(acc); setShowModal(true) }}
              onDelete={() => setConfirmDelete(acc.id)}
            />
          ))}
        </div>
      )}

      {/* Unassigned transactions note */}
      {accounts.length > 0 && unassignedCount > 0 && (
        <div className="acc-unassigned-note">
          <ArrowLeftRight size={13} color="var(--text-muted)" />
          <span>{unassignedCount} transaction{unassignedCount !== 1 ? 's' : ''} not assigned to any account — they affect your global balance but not individual account balances.</span>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditAcc(null) }}
        title={editAcc ? 'Edit Account' : 'Add Account'}
        width={440}
      >
        <AccountForm
          initial={editAcc ?? undefined}
          onSave={handleSave}
          onCancel={() => { setShowModal(false); setEditAcc(null) }}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Account" width={380}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Are you sure you want to delete this account? Transactions assigned to it will not be deleted — they'll just become unassigned.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={confirmDeleteAccount}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
