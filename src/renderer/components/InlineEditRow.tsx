import React, { useState, useRef } from 'react'
import { Check, X, Tag } from 'lucide-react'
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
  const [tags, setTags]         = useState<string[]>(transaction.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [amKey, setAmKey]       = useState(0)
  const [focused, setFocused]   = useState(false)
  const [shake, setShake]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const addTag = () => {
    const t = tagInput.trim().replace(/,/g, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const isExpense    = type === 'expense'
  const accentRaw    = isExpense ? '248,113,113' : '74,222,128'
  const accentColor  = isExpense ? 'var(--expense)' : 'var(--income)'
  const accentDim    = isExpense ? 'var(--expense-dim)' : 'var(--income-dim)'
  const borderColor  = `rgba(${accentRaw},0.35)`
  const glowColor    = `rgba(${accentRaw},0.12)`

  const parsedAmount = amount ? parseFloat(amount) : 0
  const formattedDisplay = amount && parsedAmount > 0
    ? new Intl.NumberFormat(settings.currencyLocale, { maximumFractionDigits: 2, numberingSystem: 'latn' } as Intl.NumberFormatOptions).format(parsedAmount)
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
    onSave(transaction.id, { type, category, amount: parsed, date, note, tags: tags.length > 0 ? tags : undefined })
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
          <div className="ile-field-group">
            <div className="ile-tag-label-row">
              <span className="ile-label">Tags</span>
              <span className="ile-tag-hint">Enter or , to add</span>
            </div>
            <div className="ile-tags-field" onMouseDown={e => { e.preventDefault(); tagInputRef.current?.focus() }}>
              <Tag size={11} className="ile-tags-icon" />
              <div className="ile-tags-inner">
                {tags.map(t => (
                  <span key={t} className="ile-tag-pill">
                    <span className="ile-tag-hash">#</span>{t}
                    <button type="button" className="ile-tag-x" onMouseDown={e => e.stopPropagation()} onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                      <X size={8} />
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  className="ile-tag-input"
                  type="text"
                  autoComplete="off"
                  placeholder={tags.length === 0 ? 'Add tags…' : ''}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addTag() }
                    else if (e.key === ',') { e.preventDefault(); addTag() }
                    else if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
                  }}
                />
              </div>
            </div>
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

    </div>
  )
}
