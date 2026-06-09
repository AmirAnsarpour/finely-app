import React, { useState, useMemo, useEffect } from 'react'
import { Search, ArrowLeftRight, Download } from 'lucide-react'
import DatePicker from '../components/DatePicker'
import GlassCard from '../components/GlassCard'
import TransactionItem from '../components/TransactionItem'
import SkeletonRow from '../components/SkeletonRow'
import InlineEditRow from '../components/InlineEditRow'
import Modal from '../components/Modal'
import type { Transaction } from '../types'
import type { UseDataReturn } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { formatCurrency, todayString, yesterdayString } from '../utils/formatters'
import { useCalendar } from '../utils/calendarContext'
import { useSessionState } from '../hooks/useSessionState'

interface Props { data: UseDataReturn }

type TxGroup = { label: string; date: string; items: Transaction[] }

function groupByDate(txs: Transaction[], formatDate: (iso: string) => string): TxGroup[] {
  const today = todayString()
  const yesterday = yesterdayString()
  const map = new Map<string, Transaction[]>()
  txs.forEach(t => {
    if (!map.has(t.date)) map.set(t.date, [])
    map.get(t.date)!.push(t)
  })
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    items,
    label: date === today ? 'Today' : date === yesterday ? 'Yesterday' : formatDate(date)
  }))
}

export default function Transactions({ data }: Props) {
  const { transactions, categories, accounts, settings, updateTransaction, deleteTransaction, exportCSV, refreshing } = data
  const { toast } = useToast()
  const { formatDate } = useCalendar()

  const [search, setSearch] = useSessionState('finely-tx-search', '')
  const [typeFilter, setTypeFilter] = useSessionState<'all' | 'income' | 'expense'>('finely-tx-type', 'all')
  const [categoryFilter, setCategoryFilter] = useSessionState('finely-tx-cat', '')
  const [dateFrom, setDateFrom] = useSessionState('finely-tx-from', '')
  const [dateTo, setDateTo] = useSessionState('finely-tx-to', '')
  const [tagFilter, setTagFilter] = useSessionState('finely-tx-tag', '')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(15)
  const [exporting, setExporting] = useState(false)

  // Chips: only show categories for the active type filter
  const chipCategories = useMemo(() =>
    typeFilter === 'all' ? categories : categories.filter(c => c.type === typeFilter),
    [categories, typeFilter])

  const allTags = useMemo(() =>
    [...new Set(transactions.flatMap(t => t.tags ?? []))].sort(),
    [transactions])

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (categoryFilter && t.category !== categoryFilter) return false
        if (tagFilter && !t.tags?.includes(tagFilter)) return false
        if (dateFrom && t.date < dateFrom) return false
        if (dateTo && t.date > dateTo) return false
        if (search) {
          const cat = categories.find(c => c.id === t.category)
          const q = search.toLowerCase()
          if (!cat?.name.toLowerCase().includes(q) && !t.note.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, typeFilter, categoryFilter, tagFilter, dateFrom, dateTo, search, categories])

  // Reset pagination whenever filters change
  useEffect(() => { setVisibleCount(15) }, [search, typeFilter, categoryFilter, tagFilter, dateFrom, dateTo])

  const visibleFiltered = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const groups = useMemo(() => groupByDate(visibleFiltered, formatDate), [visibleFiltered, formatDate])
  const hasMore = filtered.length > visibleCount

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const handleSave = async (id: string, changes: Partial<Transaction>) => {
    await updateTransaction(id, changes)
    toast('Transaction updated')
    setExpandedId(null)
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const ok = await exportCSV()
      if (ok) toast('CSV exported')
      else toast('Export cancelled', 'info')
    } finally {
      setExporting(false)
    }
  }

  const confirmDeleteTx = async () => {
    if (!confirmDelete) return
    await deleteTransaction(confirmDelete)
    setConfirmDelete(null)
    toast('Transaction deleted', 'info')
  }

  const fmt = (n: number) => formatCurrency(n, settings.currencySymbol, settings.currencyLocale)
  const hasFilters = search || typeFilter !== 'all' || categoryFilter || tagFilter || dateFrom || dateTo

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">{filtered.length} of {transactions.length} entries</p>
        </div>
        <div className="page-header-actions">
          {hasFilters && (
            <button className="btn-clear" onClick={() => {
              setSearch(''); setTypeFilter('all'); setCategoryFilter(''); setTagFilter(''); setDateFrom(''); setDateTo('')
            }}>
              Clear filters
            </button>
          )}
          <button className="btn-export" onClick={handleExportCSV} disabled={exporting || transactions.length === 0}>
            <Download size={13} />
            {exporting ? 'Exporting…' : 'CSV'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <GlassCard padding="sm" className="card-appear" style={{ marginBottom: 12 }}>
        <div className="filter-row">
          <div className="search-wrap">
            <Search size={14} color="var(--text-muted)" />
            <input className="search-input" placeholder="Search by category or note…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="type-pills">
            {(['all', 'income', 'expense'] as const).map(t => (
              <button key={t}
                className={`pill ${typeFilter === t ? 'pill--active' : ''} ${t !== 'all' ? t : ''}`}
                onClick={() => { setTypeFilter(t); setCategoryFilter('') }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="filter-date-wrap">
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" clearable />
          </div>
          <div className="filter-date-wrap">
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" clearable />
          </div>
        </div>

        {/* Category chips */}
        {chipCategories.length > 0 && (
          <div className="cat-chips">
            <button className={`cat-chip ${!categoryFilter ? 'cat-chip--active' : ''}`}
              onClick={() => setCategoryFilter('')}>All</button>
            {chipCategories.map(c => (
              <button key={c.id}
                className={`cat-chip ${categoryFilter === c.id ? 'cat-chip--active' : ''}`}
                onClick={() => setCategoryFilter(categoryFilter === c.id ? '' : c.id)}>
                <span className="chip-dot" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="cat-chips" style={{ paddingTop: chipCategories.length > 0 ? 4 : 2 }}>
            {allTags.map(tag => (
              <button key={tag}
                className={`cat-chip ${tagFilter === tag ? 'cat-chip--active' : ''}`}
                onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}>
                #{tag}
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Totals bar */}
      {filtered.length > 0 && (
        <div className="totals-row card-appear">
          <span style={{ color: 'var(--income)' }}>↑ {fmt(totalIncome)}</span>
          <span className="totals-sep" />
          <span style={{ color: 'var(--expense)' }}>↓ {fmt(totalExpenses)}</span>
          <span className="totals-sep" />
          <span style={{ color: totalIncome - totalExpenses >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            Net {fmt(totalIncome - totalExpenses)}
          </span>
        </div>
      )}

      {/* Date-grouped list */}
      {refreshing ? (
        <div className="groups-list card-appear">
          <div className="date-items">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      ) : groups.length === 0 ? (
        <GlassCard padding="md" className="card-appear">
          <div className="empty-state">
            <div className="tx-empty-ring">
              <ArrowLeftRight size={22} color={transactions.length === 0 ? 'var(--accent)' : 'var(--text-muted)'} />
            </div>
            <p className="empty-title">{transactions.length === 0 ? 'No transactions yet' : 'No results found'}</p>
            <span className="empty-sub">
              {transactions.length === 0
                ? <span>Press <kbd className="tx-kbd">Ctrl N</kbd> to record your first transaction</span>
                : 'Try clearing or adjusting the filters above'}
            </span>
          </div>
        </GlassCard>
      ) : (
        <div className="groups-list card-appear">
          {groups.map(group => (
            <div key={group.date} className="date-group">
              <div className="date-header">
                <span className="date-label">{group.label}</span>
                <span className="date-count">{group.items.length} transaction{group.items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="date-items">
                {group.items.map((t, i) => (
                  expandedId === t.id ? (
                    <InlineEditRow key={t.id} transaction={t} categories={categories} accounts={accounts} settings={settings}
                      onSave={handleSave} onCancel={() => setExpandedId(null)} />
                  ) : (
                    <TransactionItem key={t.id} transaction={t} categories={categories} accounts={accounts} settings={settings}
                      onEdit={() => setExpandedId(t.id)} onDelete={id => setConfirmDelete(id)}
                      animDelay={Math.min(i * 25, 200)} />
                  )
                ))}
              </div>
            </div>
          ))}
          {hasMore && (
            <button className="load-more-btn" onClick={() => setVisibleCount(c => c + 15)}>
              Load more · {filtered.length - visibleCount} remaining
            </button>
          )}
        </div>
      )}

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Transaction" width={380}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Are you sure? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={confirmDeleteTx}>Delete</button>
        </div>
      </Modal>

    </div>
  )
}
