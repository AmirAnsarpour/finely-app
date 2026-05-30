import React, { useState, useRef } from 'react'
import { Check, X } from 'lucide-react'
import Select from './Select'
import DatePicker from './DatePicker'
import type { Transaction, Category, AppSettings } from '../types'
import { todayString } from '../utils/formatters'

interface Props {
  transaction: Transaction
  categories: Category[]
  settings: AppSettings
  onSave: (id: string, changes: Partial<Transaction>) => void
  onCancel: () => void
}

export default function InlineEditRow({ transaction, categories, settings, onSave, onCancel }: Props) {
  const [type, setType]         = useState<'income' | 'expense'>(transaction.type)
  const [category, setCategory] = useState(transaction.category)
  const [amount, setAmount]     = useState(String(transaction.amount))
  const [date, setDate]         = useState(transaction.date)
  const [note, setNote]         = useState(transaction.note)
  const [amKey, setAmKey]       = useState(0)
  const [focused, setFocused]   = useState(false)
  const [shake, setShake]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isExpense    = type === 'expense'
  const accentRaw    = isExpense ? '248,113,113' : '74,222,128'
  const accentColor  = isExpense ? 'var(--expense)' : 'var(--income)'
  const accentDim    = isExpense ? 'var(--expense-dim)' : 'var(--income-dim)'
  const borderColor  = `rgba(${accentRaw},0.35)`
  const glowColor    = `rgba(${accentRaw},0.12)`

  const parsedAmount = amount ? parseFloat(amount) : 0
  const formattedDisplay = amount && parsedAmount > 0
    ? new Intl.NumberFormat(settings.currencyLocale, { maximumFractionDigits: 2 }).format(parsedAmount)
    : null

  const catOptions = categories
    .filter(c => c.type === type)
    .map(c => ({ value: c.id, label: c.name, color: c.color }))

  const handleTypeChange = (t: 'income' | 'expense') => {
    setType(t)
    const stillValid = categories.find(c => c.id === category && c.type === t)
    if (!stillValid) setCategory('')
  }

  const handleSave = () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0 || !category || !date) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    onSave(transaction.id, { type, category, amount: parsed, date, note })
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div
      className={`ile-wrap ${shake ? 'ile-shake' : ''}`}
      style={{ borderColor, boxShadow: `0 0 0 3px ${glowColor}, 0 8px 32px rgba(0,0,0,0.3)` }}
      onKeyDown={handleKey}
    >
      {/* Type toggle */}
      <div className="ile-type-row">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} type="button"
            className={`ile-type-btn ${type === t ? (t === 'expense' ? 'ile-type-btn--expense' : 'ile-type-btn--income') : ''}`}
            onClick={() => handleTypeChange(t)}>
            <span className="ile-type-dot" style={{ background: t === 'expense' ? 'var(--expense)' : 'var(--income)' }} />
            {t === 'income' ? 'Income' : 'Expense'}
          </button>
        ))}
      </div>

      {/* Body: amount left, fields right */}
      <div className="ile-body">

        {/* Premium amount display */}
        <div
          className={`ile-amount-panel ${focused ? 'ile-amount-panel--focused' : ''}`}
          style={focused
            ? { background: `rgba(${accentRaw},0.04)`, borderColor: `rgba(${accentRaw},0.22)` }
            : undefined
          }
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            className="ile-ghost-input"
            type="number" step="0.01" min="0"
            value={amount}
            onChange={e => { setAmount(e.target.value); setAmKey(k => k + 1) }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus
          />
          <div className="ile-amount-num" key={amKey}>
            {formattedDisplay
              ? <span style={{ color: accentColor }}>{formattedDisplay}</span>
              : <span className="ile-amount-ghost">0</span>
            }
          </div>
          <div className="ile-amount-sym">{settings.currencySymbol}</div>
          <div
            className={`ile-underline ${focused ? 'ile-underline--on' : ''}`}
            style={{ background: `linear-gradient(90deg, transparent, rgba(${accentRaw},0.75), transparent)` }}
          />
        </div>

        {/* Right column: meta fields */}
        <div className="ile-fields">
          <div className="ile-field-group">
            <span className="ile-label">Category</span>
            <Select value={category} onChange={setCategory} options={catOptions} placeholder="Select…" />
          </div>
          <div className="ile-field-group">
            <span className="ile-label">Date</span>
            <DatePicker value={date} onChange={setDate} max={todayString()} />
          </div>
          <div className="ile-field-group">
            <span className="ile-label">Note</span>
            <input
              className="ile-note"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional note…"
              maxLength={200}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="ile-actions">
        <button type="button" className="ile-btn ile-btn--cancel" onClick={onCancel}>
          <X size={13} />
          Cancel
        </button>
        <button
          type="button"
          className="ile-btn ile-btn--save"
          style={{ background: accentDim, borderColor, color: accentColor }}
          onClick={handleSave}
        >
          <Check size={13} />
          Save Changes
        </button>
      </div>

      <style>{`
        .ile-wrap {
          padding: 16px; border-radius: var(--radius-md);
          background: rgba(255,255,255,0.032);
          border: 1px solid;
          display: flex; flex-direction: column; gap: 14px;
          animation: slideDown 0.22s var(--ease-spring) both;
          transition: background var(--transition);
        }
        @keyframes ile-shake-anim {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-5px); }
          40%     { transform: translateX(5px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(3px); }
        }
        .ile-shake { animation: ile-shake-anim 0.45s var(--ease-out) both !important; }

        /* Type toggle */
        .ile-type-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm); padding: 3px;
        }
        .ile-type-btn {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 7px 10px; border-radius: 7px;
          background: transparent; border: 1px solid transparent;
          color: var(--text-muted); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all var(--transition); font-family: inherit;
        }
        .ile-type-btn:hover { color: var(--text-secondary); background: var(--glass-bg-hover); }
        .ile-type-btn--expense { background: var(--expense-dim) !important; color: var(--expense) !important; border-color: rgba(248,113,113,0.28) !important; }
        .ile-type-btn--income  { background: var(--income-dim)  !important; color: var(--income)  !important; border-color: rgba(74,222,128,0.28)  !important; }
        .ile-type-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        /* Body layout */
        .ile-body { display: grid; grid-template-columns: 200px 1fr; gap: 14px; align-items: stretch; }

        /* Amount panel */
        .ile-amount-panel {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; border-radius: var(--radius-md); padding: 18px 14px 14px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          cursor: text; position: relative; overflow: hidden;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .ile-amount-panel--focused { background: rgba(255,255,255,0.04); }
        .ile-ghost-input {
          position: absolute; inset: 0; width: 100%; height: 100%;
          opacity: 0; cursor: text; border: none; background: transparent; outline: none;
          appearance: textfield; -moz-appearance: textfield;
        }
        .ile-ghost-input::-webkit-outer-spin-button,
        .ile-ghost-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .ile-amount-num {
          font-size: 36px; font-weight: 700; letter-spacing: -1.5px; line-height: 1;
          font-variant-numeric: tabular-nums; pointer-events: none; user-select: none;
          animation: amountPop 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
          text-align: center;
        }
        .ile-amount-ghost { color: rgba(255,255,255,0.1); }
        .ile-amount-sym {
          font-size: 11px; font-weight: 500; color: var(--text-muted);
          letter-spacing: 0.3px; pointer-events: none; user-select: none;
        }
        .ile-underline {
          width: 32%; height: 1px; border-radius: 1px;
          opacity: 0; transition: opacity 0.35s ease, width 0.35s ease;
          pointer-events: none;
        }
        .ile-underline--on { opacity: 1; width: 56%; animation: underlinePulse 2.4s ease-in-out infinite; }

        /* Right fields */
        .ile-fields { display: flex; flex-direction: column; gap: 8px; }
        .ile-field-group { display: flex; flex-direction: column; gap: 4px; }
        .ile-label { font-size: 11px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
        .ile-note {
          width: 100%; padding: 9px 12px; border-radius: var(--radius-sm);
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          color: var(--text-primary); font-size: 13px; font-family: inherit;
          outline: none; transition: border-color var(--transition), box-shadow var(--transition);
          user-select: text;
        }
        .ile-note:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); background: var(--glass-bg-hover); }
        .ile-note::placeholder { color: var(--text-muted); }

        /* Actions */
        .ile-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .ile-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: var(--radius-sm);
          font-size: 13px; font-weight: 600; cursor: pointer;
          border: 1px solid; transition: all var(--transition); font-family: inherit;
        }
        .ile-btn--cancel {
          background: var(--glass-bg); border-color: var(--glass-border); color: var(--text-secondary);
        }
        .ile-btn--cancel:hover { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .ile-btn--save:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .ile-btn--save:active { transform: scale(0.98); }
      `}</style>
    </div>
  )
}
