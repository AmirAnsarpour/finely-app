import React, { useState, useEffect, useRef } from 'react'
import type { Transaction, Category, AppSettings } from '../types'
import { todayString } from '../utils/formatters'
import Select from '../components/Select'
import DatePicker from '../components/DatePicker'

interface Props {
  categories: Category[]
  settings: AppSettings
  initial?: Transaction
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}

export default function TransactionForm({ categories, settings, initial, onSave, onCancel, onDirtyChange }: Props) {
  const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [date, setDate] = useState(initial?.date ?? todayString())
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [animKey, setAnimKey] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = categories.filter(c => c.type === type)
  const categoryOptions = filtered.map(c => ({ value: c.id, label: c.name, color: c.color }))

  const isDirty = !initial
    ? (amount !== '' || category !== '' || note !== '')
    : (amount !== initial.amount.toString() || category !== initial.category || date !== initial.date || note !== initial.note || type !== initial.type)

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty])

  const parsedAmount = amount ? parseFloat(amount) : 0
  const accentColor = type === 'expense' ? 'var(--expense)' : 'var(--income)'
  const accentRaw = type === 'expense' ? '248,113,113' : '74,222,128'

  const formattedDisplay = amount && parsedAmount > 0
    ? new Intl.NumberFormat(settings.currencyLocale, { maximumFractionDigits: 2 }).format(parsedAmount)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    if (!category) { setError('Select a category'); return }
    setError('')
    setSaving(true)
    try {
      await onSave({ type, amount: amt, category, date, note })
      onDirtyChange?.(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tx-form">
      {/* Type toggle */}
      <div className="type-toggle">
        <button type="button" className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
          onClick={() => { setType('expense'); setCategory('') }}>
          Expense
        </button>
        <button type="button" className={`type-btn ${type === 'income' ? 'active income' : ''}`}
          onClick={() => { setType('income'); setCategory('') }}>
          Income
        </button>
      </div>

      {/* Premium amount display */}
      <div
        className={`amount-glass ${focused ? 'amount-glass--focused' : ''}`}
        style={focused ? { boxShadow: `0 0 0 1px rgba(${accentRaw},0.18), 0 0 48px rgba(${accentRaw},0.07)` } : undefined}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Invisible input captures all keystrokes */}
        <input
          ref={inputRef}
          className="amount-ghost-input"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={e => { setAmount(e.target.value); setAnimKey(k => k + 1) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus
        />

        {/* Animated number display */}
        <div className="amount-number" key={animKey}>
          {formattedDisplay
            ? <span style={{ color: accentColor }}>{formattedDisplay}</span>
            : <span className="amount-ghost">0</span>
          }
        </div>

        {/* Currency label */}
        <div className="amount-currency">{settings.currencySymbol}</div>

        {/* Gradient underline — pulses on focus */}
        <div
          className={`amount-underline ${focused ? 'amount-underline--on' : ''}`}
          style={{ background: `linear-gradient(90deg, transparent, rgba(${accentRaw},0.7), transparent)` }}
        />
      </div>

      {/* Bottom fields */}
      <div className="fields-grid">
        <div className="form-group">
          <label className="form-label">Category</label>
          <Select value={category} onChange={setCategory} options={categoryOptions} placeholder="Select…" />
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <DatePicker value={date} onChange={setDate} max={todayString()} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Note <span className="form-label--opt">(optional)</span></label>
        <input type="text" placeholder="Add a note…" value={note}
          onChange={e => setNote(e.target.value)} className="form-input" maxLength={200} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-submit" disabled={saving}
          style={{ background: accentColor === 'var(--expense)' ? 'rgba(248,113,113,0.15)' : undefined,
                   borderColor: accentColor, color: accentColor }}>
          {saving ? 'Saving…' : initial ? 'Save Changes' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
        </button>
      </div>

      <style>{`
        .tx-form { display: flex; flex-direction: column; gap: 16px; }
        .type-toggle {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          border-radius: var(--radius-md); padding: 4px;
        }
        .type-btn {
          padding: 9px 12px; border-radius: var(--radius-sm);
          background: transparent; border: 1px solid transparent;
          color: var(--text-secondary); font-size: 14px; font-weight: 500;
          cursor: pointer; transition: all var(--transition);
        }
        .type-btn.active.expense { background: var(--expense-dim); color: var(--expense); border-color: rgba(248,113,113,0.3); }
        .type-btn.active.income  { background: var(--income-dim);  color: var(--income);  border-color: rgba(74,222,128,0.3);  }

        .amount-glass {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; padding: 28px 24px 22px;
          border-radius: 20px;
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(255,255,255,0.055);
          cursor: text;
          transition: background 0.35s ease, box-shadow 0.35s ease;
          overflow: hidden;
        }
        .amount-glass--focused {
          background: rgba(255,255,255,0.045);
        }
        .amount-ghost-input {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          opacity: 0; cursor: text;
          border: none; background: transparent; outline: none;
          appearance: textfield; -moz-appearance: textfield;
        }
        .amount-ghost-input::-webkit-outer-spin-button,
        .amount-ghost-input::-webkit-inner-spin-button { -webkit-appearance: none; }

        .amount-number {
          font-size: 54px; font-weight: 700; letter-spacing: -2px; line-height: 1;
          font-variant-numeric: tabular-nums;
          animation: amountPop 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
          pointer-events: none; user-select: none;
        }
        .amount-ghost {
          color: rgba(255,255,255,0.12);
        }
        .amount-currency {
          font-size: 12px; font-weight: 500; color: var(--text-muted);
          letter-spacing: 0.3px; pointer-events: none; user-select: none;
        }
        .amount-underline {
          width: 32%; height: 1px; border-radius: 1px;
          opacity: 0; transition: opacity 0.4s ease, width 0.4s ease;
          pointer-events: none;
        }
        .amount-underline--on {
          opacity: 1; width: 56%;
          animation: underlinePulse 2.4s ease-in-out infinite;
        }
        @keyframes amountPop {
          0%   { transform: scale(0.86) translateY(6px); opacity: 0.4; }
          65%  { transform: scale(1.04) translateY(-1px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes underlinePulse {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 0.9; }
        }

        .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 12px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
        .form-label--opt { font-weight: 400; text-transform: none; letter-spacing: 0; }
        .form-input { user-select: text; font-size: 14px; }
        .form-error {
          font-size: 12px; color: var(--expense); background: var(--expense-dim);
          padding: 8px 12px; border-radius: var(--radius-sm);
          border: 1px solid rgba(248,113,113,0.25);
        }
        .form-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
        .btn-submit {
          padding: 10px 24px; border-radius: var(--radius-md);
          background: var(--accent-dim); color: var(--accent);
          font-size: 14px; font-weight: 600; cursor: pointer;
          border: 1px solid var(--accent); transition: all var(--transition);
        }
        .btn-submit:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost {
          padding: 10px 20px; border-radius: var(--radius-md);
          background: var(--glass-bg); color: var(--text-secondary);
          font-size: 14px; font-weight: 500; cursor: pointer;
          border: 1px solid var(--glass-border); transition: all var(--transition);
        }
        .btn-ghost:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
      `}</style>
    </form>
  )
}
