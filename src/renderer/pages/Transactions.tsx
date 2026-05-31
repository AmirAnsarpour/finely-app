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

interface Props { data: UseDataReturn }

// Persist filter state across navigation
function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    const saved = sessionStorage.getItem(key)
    return saved !== null ? (JSON.parse(saved) as T) : initial
  })
  useEffect(() => { sessionStorage.setItem(key, JSON.stringify(state)) }, [key, state])
  return [state, setState] as const
}

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
  const { transactions, categories, settings, updateTransaction, deleteTransaction, exportCSV, refreshing } = data
  const { toast } = useToast()
  const { formatDate } = useCalendar()

  const [search, setSearch] = usePersistedState('finely-tx-search', '')
  const [typeFilter, setTypeFilter] = usePersistedState<'all' | 'income' | 'expense'>('finely-tx-type', 'all')
  const [categoryFilter, setCategoryFilter] = usePersistedState('finely-tx-cat', '')
  const [dateFrom, setDateFrom] = usePersistedState('finely-tx-from', '')
  const [dateTo, setDateTo] = usePersistedState('finely-tx-to', '')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(15)
  const [exporting, setExporting] = useState(false)

  // Chips: only show categories for the active type filter
  const chipCategories = useMemo(() =>
    typeFilter === 'all' ? categories : categories.filter(c => c.type === typeFilter),
    [categories, typeFilter])

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (categoryFilter && t.category !== categoryFilter) return false
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
  }, [transactions, typeFilter, categoryFilter, dateFrom, dateTo, search, categories])

  // Reset pagination whenever filters change
  useEffect(() => { setVisibleCount(15) }, [search, typeFilter, categoryFilter, dateFrom, dateTo])

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
  const hasFilters = search || typeFilter !== 'all' || categoryFilter || dateFrom || dateTo

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
              setSearch(''); setTypeFilter('all'); setCategoryFilter(''); setDateFrom(''); setDateTo('')
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
            <ArrowLeftRight size={40} color="var(--text-muted)" />
            <p>{transactions.length === 0 ? 'No transactions yet' : 'No results found'}</p>
            <span>{transactions.length === 0 ? 'Add one from the sidebar (or Ctrl+N)' : 'Try adjusting filters'}</span>
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
                    <InlineEditRow key={t.id} transaction={t} categories={categories} settings={settings}
                      onSave={handleSave} onCancel={() => setExpandedId(null)} />
                  ) : (
                    <TransactionItem key={t.id} transaction={t} categories={categories} settings={settings}
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

      <style>{`
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
        .page-header-actions { display: flex; align-items: center; gap: 8px; }
        .page-title {
          font-size: 26px; font-weight: 700; letter-spacing: -0.5px;
          background: linear-gradient(135deg, #e8eaff 0%, rgba(255,255,255,0.65) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
        .btn-clear { padding: 6px 12px; border-radius: var(--radius-sm); background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-muted); font-size: 12px; cursor: pointer; transition: all var(--transition); }
        .btn-clear:hover { color: var(--text-primary); border-color: var(--glass-border-hover); }
        .btn-export { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-sm); background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all var(--transition); }
        .btn-export:hover:not(:disabled) { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .btn-export:disabled { opacity: 0.4; cursor: not-allowed; }

        .filter-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
        .search-wrap { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 180px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 7px 11px; transition: border-color var(--transition), box-shadow var(--transition); }
        .search-wrap:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
        .search-input { flex: 1; background: transparent; border: none; padding: 0; font-size: 13px; color: var(--text-primary); outline: none; box-shadow: none; }
        .type-pills { display: flex; gap: 4px; }
        .pill { padding: 6px 11px; border-radius: var(--radius-sm); background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all var(--transition); white-space: nowrap; }
        .pill--active { background: var(--accent-dim); color: var(--accent); border-color: var(--glass-border-accent); }
        .pill.income.pill--active { background: var(--income-dim); color: var(--income); border-color: rgba(74,222,128,0.3); }
        .pill.expense.pill--active { background: var(--expense-dim); color: var(--expense); border-color: rgba(248,113,113,0.3); }
        .filter-date-wrap { width: 148px; flex-shrink: 0; }

        .cat-chips { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 2px; }
        .cat-chip { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all var(--transition); white-space: nowrap; }
        .cat-chip:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .cat-chip--active { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        .totals-row { display: flex; gap: 12px; align-items: center; font-size: 13px; font-weight: 500; margin-bottom: 12px; }
        .totals-sep { width: 1px; height: 14px; background: var(--glass-border); }

        .groups-list { display: flex; flex-direction: column; gap: 20px; max-height: calc(100vh - 320px); overflow-y: auto; padding-right: 2px; padding-bottom: 4px; }
        .load-more-btn { width: 100%; padding: 11px; border-radius: var(--radius-md); background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--transition); }
        .load-more-btn:hover { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .date-group {}
        .date-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 0 2px; }
        .date-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        .date-count { font-size: 11px; color: var(--text-muted); }
        .date-items { display: flex; flex-direction: column; gap: 6px; }

        .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; gap: 8px; text-align: center; }
        .empty-state p { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
        .empty-state span { font-size: 12px; color: var(--text-muted); }

        .btn-ghost { padding: 9px 18px; border-radius: var(--radius-md); background: var(--glass-bg); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid var(--glass-border); transition: all var(--transition); }
        .btn-ghost:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .btn-danger { padding: 9px 18px; border-radius: var(--radius-md); background: var(--expense-dim); color: var(--expense); font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid rgba(248,113,113,0.3); transition: all var(--transition); }
        .btn-danger:hover { background: rgba(248,113,113,0.2); }
      `}</style>
    </div>
  )
}
