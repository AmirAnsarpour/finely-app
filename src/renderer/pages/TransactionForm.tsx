import React, { useState, useEffect, useRef } from 'react'
import { Lightbulb, Tag, X } from 'lucide-react'
import type { Account, Transaction, Category, AppSettings } from '../types'
import { todayString, formatCurrency } from '../utils/formatters'
import { normalizeDigits } from '../utils/numerals'
import Select from '../components/Select'
import DatePicker from '../components/DatePicker'

interface Props {
  categories: Category[]
  accounts: Account[]
  settings: AppSettings
  transactions: Transaction[]
  initial?: Transaction
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}

export default function TransactionForm({ categories, accounts, settings, transactions, initial, onSave, onCancel, onDirtyChange }: Props) {
  const [type, setType]           = useState<'income' | 'expense'>(initial?.type ?? 'expense')
  const [amount, setAmount]       = useState(initial?.amount?.toString() ?? '')
  const [category, setCategory]   = useState(initial?.category ?? '')
  const [accountId, setAccountId] = useState(initial?.accountId ?? '')
  const [date, setDate]           = useState(initial?.date ?? todayString())
  const [note, setNote]           = useState(initial?.note ?? '')
  const [tags, setTags]           = useState<string[]>(initial?.tags ?? [])
  const [tagInput, setTagInput]   = useState('')
  const [suggestion, setSuggestion] = useState<{ categoryId: string; categoryName: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [animKey, setAnimKey] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef    = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const accountOptions = accounts.map(a => ({ value: a.id, label: a.name, color: a.color }))

  const filtered = categories.filter(c => c.type === type)
  const categoryOptions = filtered.map(c => ({ value: c.id, label: c.name, color: c.color }))

  const isDirty = !initial
    ? (amount !== '' || category !== '' || accountId !== '' || note !== '' || tags.length > 0)
    : (amount !== initial.amount.toString() || category !== initial.category || accountId !== (initial.accountId ?? '') || date !== initial.date || note !== initial.note || type !== initial.type || JSON.stringify(tags) !== JSON.stringify(initial.tags ?? []))

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty])

  useEffect(() => {
    const trimmed = note.trim()
    if (trimmed.length < 2) { setSuggestion(null); return }
    const counts = new Map<string, number>()
    transactions.forEach(t => {
      if (t.type !== type) return
      const tNote = t.note.trim()
      if (tNote.length < 2) return
      if (trimmed.includes(tNote) || tNote.includes(trimmed)) {
        counts.set(t.category, (counts.get(t.category) ?? 0) + 1)
      }
    })
    let topCatId = ''
    let topCount = 0
    counts.forEach((count, catId) => { if (count > topCount) { topCount = count; topCatId = catId } })
    if (topCount >= 2 && topCatId && topCatId !== category) {
      const cat = categories.find(c => c.id === topCatId)
      setSuggestion(cat ? { categoryId: topCatId, categoryName: cat.name } : null)
    } else {
      setSuggestion(null)
    }
  }, [note, type, transactions, category])

  const addTag = () => {
    const t = tagInput.trim().replace(/,/g, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addTag() }
    else if (e.key === ',') { e.preventDefault(); addTag() }
  }

  const parsedAmount = amount ? parseFloat(amount) : 0
  const accentColor = type === 'expense' ? 'var(--expense)' : 'var(--income)'
  const accentRaw = type === 'expense' ? '248,113,113' : '74,222,128'

  const formattedDisplay = amount && parsedAmount > 0
    ? new Intl.NumberFormat(settings.currencyLocale, { maximumFractionDigits: 2, numberingSystem: 'latn' } as Intl.NumberFormatOptions).format(parsedAmount)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    if (!category) { setError('Select a category'); return }

    // Balance validation: block expense if account balance is insufficient
    if (type === 'expense' && accountId) {
      const balance = transactions
        .filter(t => t.accountId === accountId && t.id !== initial?.id)
        .reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
      if (amt > balance) {
        const account = accounts.find(a => a.id === accountId)
        const fmt = (n: number) => formatCurrency(n, settings.currencySymbol, settings.currencyLocale)
        setError(`Insufficient balance in ${account?.name ?? 'this account'} — available: ${fmt(Math.max(0, balance))}`)
        return
      }
    }

    setError('')
    setSaving(true)
    try {
      await onSave({ type, amount: amt, category, date, note, tags: tags.length > 0 ? tags : undefined, accountId: accountId || undefined })
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
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={e => {
            const raw = normalizeDigits(e.target.value)
            // Strip everything except digits and the first decimal point
            const stripped = raw.replace(/[^\d.]/g, '')
            const dot = stripped.indexOf('.')
            const cleaned = dot === -1
              ? stripped
              : stripped.slice(0, dot + 1) + stripped.slice(dot + 1).replace(/\./g, '')
            setAmount(cleaned)
            setAnimKey(k => k + 1)
          }}
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

      {accounts.length > 0 && (
        <div className="form-group">
          <label className="form-label">Account <span className="form-label--opt">(optional)</span></label>
          <Select
            value={accountId}
            onChange={setAccountId}
            options={accountOptions}
            placeholder="No account selected…"
            clearable
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Note <span className="form-label--opt">(optional)</span></label>
        <input type="text" placeholder="Add a note…" value={note}
          onChange={e => setNote(e.target.value)} className="form-input" maxLength={200} />
      </div>

      {suggestion && (
        <div className="tx-suggestion">
          <Lightbulb size={13} />
          <span>Suggested: <strong>{suggestion.categoryName}</strong></span>
          <button type="button" className="tx-suggestion__use" onClick={() => setCategory(suggestion.categoryId)}>
            Use it
          </button>
        </div>
      )}

      <div className="form-group">
        <div className="tx-tag-label-row">
          <label className="form-label">Tags <span className="form-label--opt">(optional)</span></label>
          <span className="tx-tag-hint">Enter or , to add</span>
        </div>
        <div className="tx-tags-field" onMouseDown={e => { e.preventDefault(); tagInputRef.current?.focus() }}>
          <Tag size={12} className="tx-tags-icon" />
          <div className="tx-tags-inner">
            {tags.map(t => (
              <span key={t} className="tx-tag-pill">
                <span className="tx-tag-hash">#</span>{t}
                <button type="button" className="tx-tag-x" onMouseDown={e => e.stopPropagation()} onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                  <X size={9} />
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              className="tx-tag-input"
              type="text"
              autoComplete="off"
              placeholder={tags.length === 0 ? 'vacation, food, work…' : ''}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
          </div>
        </div>
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
    </form>
  )
}
