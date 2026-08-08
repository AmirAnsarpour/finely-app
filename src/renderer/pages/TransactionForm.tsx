import React, { useState, useEffect, useRef } from 'react'
import { Lightbulb, Tag, X, ArrowLeftRight, Sparkles } from 'lucide-react'
import type { Account, Transaction, Category, AppSettings } from '../types'
import { todayString, formatCurrency } from '../utils/formatters'
import { normalizeDigits } from '../utils/numerals'
import { accountBalance } from '../utils/accountBalance'
import { fileManager } from '../utils/fileManager'
import { askAI } from '../utils/aiClient'
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
  const [type, setType]           = useState<'income' | 'expense' | 'transfer'>(initial?.type ?? 'expense')
  const [amount, setAmount]       = useState(initial?.amount?.toString() ?? '')
  const [category, setCategory]   = useState(initial?.category ?? '')
  const [accountId, setAccountId] = useState(initial?.accountId ?? '')
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? '')
  const [date, setDate]           = useState(initial?.date ?? todayString())
  const [note, setNote]           = useState(initial?.note ?? '')
  const [tags, setTags]           = useState<string[]>(initial?.tags ?? [])
  const [tagInput, setTagInput]   = useState('')
  const [suggestion, setSuggestion] = useState<{ categoryId: string; categoryName: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [animKey, setAnimKey] = useState(0)
  const [focused, setFocused] = useState(false)
  const [hasAIKey, setHasAIKey] = useState(false)
  const [nlInput, setNlInput]   = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const [nlError, setNlError]   = useState('')
  const inputRef    = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const aiSuggestSeq = useRef(0)

  useEffect(() => { fileManager.aiHasKey().then(setHasAIKey) }, [])

  const isTransfer = type === 'transfer'
  const canTransfer = accounts.length >= 2
  const accountOptions = accounts.map(a => ({ value: a.id, label: a.name, color: a.color }))
  const fromAccountOptions = accountOptions.filter(o => o.value !== toAccountId)
  const toAccountOptions = accountOptions.filter(o => o.value !== accountId)

  const filtered = categories.filter(c => c.type === type)
  const categoryOptions = filtered.map(c => ({ value: c.id, label: c.name, color: c.color }))

  const isDirty = !initial
    ? (amount !== '' || category !== '' || accountId !== '' || toAccountId !== '' || note !== '' || tags.length > 0)
    : (amount !== initial.amount.toString() || category !== initial.category || accountId !== (initial.accountId ?? '') || toAccountId !== (initial.toAccountId ?? '') || date !== initial.date || note !== initial.note || type !== initial.type || JSON.stringify(tags) !== JSON.stringify(initial.tags ?? []))

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty])

  useEffect(() => {
    const trimmed = note.trim()
    if (isTransfer || trimmed.length < 2) { setSuggestion(null); return }
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

  // AI fallback: only kicks in when the instant history-based heuristic above
  // found nothing (novel wording, no matching past notes). Debounced so it
  // doesn't fire an AI call on every keystroke, and guarded against stale
  // responses landing after the note/type has changed again.
  useEffect(() => {
    if (!hasAIKey || isTransfer || suggestion) return
    const trimmed = note.trim()
    if (trimmed.length < 4) return
    const names = filtered.map(c => c.name)
    if (names.length === 0) return
    const seq = ++aiSuggestSeq.current
    const timer = setTimeout(async () => {
      try {
        const systemPrompt = 'You categorize personal finance transactions. Given a list of allowed category names and a short note, reply with EXACTLY ONE category name copied verbatim from the list that best matches the note, and nothing else — no punctuation, no explanation. If nothing fits reasonably, reply with exactly: NONE'
        const userPrompt = `Categories: ${names.join(', ')}\nNote: "${trimmed}"`
        const result = await askAI(settings, 'category-suggestion', systemPrompt, userPrompt)
        if (seq !== aiSuggestSeq.current) return
        const picked = result.trim().replace(/^"|"$/g, '')
        if (picked.toLowerCase() === 'none') return
        const cat = filtered.find(c => c.name.trim().toLowerCase() === picked.toLowerCase())
        if (cat && cat.id !== category) setSuggestion({ categoryId: cat.id, categoryName: cat.name })
      } catch {
        // Best-effort enhancement — never surface an error for this.
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [note, type, hasAIKey, suggestion])

  const addTag = () => {
    const t = tagInput.trim().replace(/,/g, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addTag() }
    else if (e.key === ',') { e.preventDefault(); addTag() }
  }

  // Parses free text like "20 dollars lunch yesterday" into the form fields
  // below for the user to review — it fills fields, it never submits.
  async function handleParseNL() {
    const text = nlInput.trim()
    if (!text || nlLoading) return
    setNlLoading(true)
    setNlError('')
    try {
      const expenseNames = categories.filter(c => c.type === 'expense').map(c => c.name)
      const incomeNames = categories.filter(c => c.type === 'income').map(c => c.name)
      const today = todayString()
      const systemPrompt = [
        'You parse a short free-text transaction description into structured fields.',
        `Today's date is ${today} (YYYY-MM-DD).`,
        'Reply with EXACTLY ONE line in this exact format and nothing else, no explanation:',
        'TYPE|CATEGORY|AMOUNT|DATE|NOTE',
        '- TYPE: "expense" or "income"',
        `- CATEGORY: one name copied verbatim from the matching list — expense categories: ${expenseNames.join(', ') || '(none)'}; income categories: ${incomeNames.join(', ') || '(none)'}`,
        '- AMOUNT: a plain positive number, digits and at most one decimal point only, no currency symbols or thousands separators',
        '- DATE: YYYY-MM-DD, resolved from any relative date mentioned (e.g. "yesterday"); default to today if nothing is mentioned; never a future date',
        '- NOTE: a short cleaned-up description of what the transaction was for, or "-" if there is nothing beyond the category',
        'Always fill every field with your best guess — never omit a field or add extra text before or after the line.',
      ].join('\n')
      const result = await askAI(settings, 'quick-add-parse', systemPrompt, text)
      const line = result.trim().split('\n')[0]
      const parts = line.split('|').map(p => p.trim())
      if (parts.length !== 5) throw new Error('Could not parse that — try rephrasing.')
      const [pType, pCategory, pAmount, pDate, pNote] = parts

      const resolvedType: 'income' | 'expense' = pType.toLowerCase() === 'income' ? 'income' : 'expense'
      const pool = categories.filter(c => c.type === resolvedType)
      const matchedCat = pool.find(c => c.name.trim().toLowerCase() === pCategory.toLowerCase())
      const amt = parseFloat(pAmount.replace(/[^0-9.]/g, ''))
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(pDate) && pDate <= today ? pDate : today

      setType(resolvedType)
      if (matchedCat) setCategory(matchedCat.id)
      if (!isNaN(amt) && amt > 0) setAmount(amt.toString())
      setDate(validDate)
      if (pNote && pNote !== '-') setNote(pNote)
      setNlInput('')
    } catch (err) {
      setNlError(err instanceof Error ? err.message : 'Something went wrong parsing that.')
    } finally {
      setNlLoading(false)
    }
  }

  const parsedAmount = amount ? parseFloat(amount) : 0
  const accentColor = isTransfer ? 'var(--accent)' : type === 'expense' ? 'var(--expense)' : 'var(--income)'
  const accentRaw = isTransfer ? '108,142,245' : type === 'expense' ? '248,113,113' : '74,222,128'

  const formattedDisplay = amount && parsedAmount > 0
    ? new Intl.NumberFormat(settings.currencyLocale, { maximumFractionDigits: 2, numberingSystem: 'latn' } as Intl.NumberFormatOptions).format(parsedAmount)
    : null

  function accountBalanceExcluding(accId: string): number {
    const txs = initial ? transactions.filter(t => t.id !== initial.id) : transactions
    return accountBalance(txs, accId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }

    const fmt = (n: number) => formatCurrency(n, settings.currencySymbol, settings.currencyLocale)

    if (isTransfer) {
      if (!accountId || !toAccountId) { setError('Select both a source and destination account'); return }
      if (accountId === toAccountId) { setError('Source and destination accounts must be different'); return }
      const balance = accountBalanceExcluding(accountId)
      if (amt > balance) {
        const account = accounts.find(a => a.id === accountId)
        setError(`Insufficient balance in ${account?.name ?? 'this account'} — available: ${fmt(Math.max(0, balance))}`)
        return
      }
      setError('')
      setSaving(true)
      try {
        await onSave({ type: 'transfer', amount: amt, category: '', date, note, tags: tags.length > 0 ? tags : undefined, accountId, toAccountId })
        onDirtyChange?.(false)
      } finally {
        setSaving(false)
      }
      return
    }

    if (!category) { setError('Select a category'); return }

    // Balance validation: block expense if account balance is insufficient
    if (type === 'expense' && accountId) {
      const balance = accountBalanceExcluding(accountId)
      if (amt > balance) {
        const account = accounts.find(a => a.id === accountId)
        setError(`Insufficient balance in ${account?.name ?? 'this account'} — available: ${fmt(Math.max(0, balance))}`)
        return
      }
    }

    setError('')
    setSaving(true)
    try {
      await onSave({ type, amount: amt, category, date, note, tags: tags.length > 0 ? tags : undefined, accountId: accountId || undefined, toAccountId: undefined })
      onDirtyChange?.(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tx-form">
      {!initial && !isTransfer && hasAIKey && (
        <div className="tx-nl">
          <div className="tx-nl__field">
            <Sparkles size={13} className="tx-nl__icon" />
            <input
              type="text"
              className="tx-nl__input"
              placeholder="Try: '20 dollars lunch yesterday'…"
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleParseNL() } }}
            />
            <button type="button" className="tx-nl__btn" onClick={handleParseNL} disabled={nlLoading || !nlInput.trim()}>
              {nlLoading ? 'Parsing…' : 'Parse'}
            </button>
          </div>
          {nlError && <p className="form-error">{nlError}</p>}
        </div>
      )}

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
        {canTransfer && (
          <button type="button" className={`type-btn ${isTransfer ? 'active' : ''}`}
            style={isTransfer ? { color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)' } : undefined}
            onClick={() => { setType('transfer'); setCategory('') }}>
            <ArrowLeftRight size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
            Transfer
          </button>
        )}
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

      {isTransfer ? (
        <>
          <div className="fields-grid">
            <div className="form-group">
              <label className="form-label">From Account</label>
              <Select value={accountId} onChange={setAccountId} options={fromAccountOptions} placeholder="Select…" />
            </div>
            <div className="form-group">
              <label className="form-label">To Account</label>
              <Select value={toAccountId} onChange={setToAccountId} options={toAccountOptions} placeholder="Select…" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <DatePicker value={date} onChange={setDate} max={todayString()} />
          </div>
        </>
      ) : (
        <>
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
        </>
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
          {saving ? 'Saving…' : initial ? 'Save Changes' : isTransfer ? 'Transfer' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
        </button>
      </div>
    </form>
  )
}
