import React, { useState, useMemo } from 'react'
import { Download, TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import { MonthlyBarChart, ExpensePieChart, DailySpendingChart } from '../components/Chart'
import CategoryIcon from '../components/CategoryIcon'
import type { UseDataReturn } from '../hooks/useData'
import {
  formatCurrency, getMonthKey,
  getLast12Months, previousMonthKey
} from '../utils/formatters'
import { useCalendar } from '../utils/calendarContext'
import { useToast } from '../components/Toast'

interface Props { data: UseDataReturn }

function DeltaBadge({ cur, prev, goodIfPositive }: { cur: number; prev: number; goodIfPositive: boolean }) {
  if (prev === 0) return <span className="r-delta r-delta--neutral">— no prior data</span>
  const pct = ((cur - prev) / prev) * 100
  const isGood = goodIfPositive ? pct >= 0 : pct <= 0
  return (
    <span className={`r-delta ${isGood ? 'r-delta--good' : 'r-delta--bad'}`}>
      {pct > 0 ? <ArrowUpRight size={11} /> : pct < 0 ? <ArrowDownRight size={11} /> : <Minus size={11} />}
      {Math.abs(pct).toFixed(1)}% vs last month
    </span>
  )
}

export default function Reports({ data }: Props) {
  const { transactions, categories, settings, exportCSV } = data
  const { toast } = useToast()
  const { formatDateShort, getMonthLabel } = useCalendar()

  const months = getLast12Months()
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1])

  const fmt = (n: number) => formatCurrency(n, settings.currencySymbol, settings.currencyLocale)

  // ── Selected month data ──────────────────────────────────
  const currentTxs = useMemo(() =>
    transactions.filter(t => getMonthKey(t.date) === selectedMonth),
    [transactions, selectedMonth])

  const monthIncome   = currentTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpenses = currentTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthNet      = monthIncome - monthExpenses
  const savingsRate   = monthIncome > 0 ? (monthNet / monthIncome) * 100 : 0

  // ── Previous month for comparison ───────────────────────
  const prevMonth = useMemo(() => previousMonthKey(selectedMonth), [selectedMonth])
  const prevTxs = useMemo(() =>
    transactions.filter(t => getMonthKey(t.date) === prevMonth),
    [transactions, prevMonth])
  const prevIncome   = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevExpenses = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // ── Expense / income breakdown ───────────────────────────
  const expenseBreakdown = useMemo(() => {
    const txs = currentTxs.filter(t => t.type === 'expense')
    const total = txs.reduce((s, t) => s + t.amount, 0)
    const map = new Map<string, number>()
    txs.forEach(t => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId)
        return { categoryId: catId, category: cat?.name ?? 'Unknown', color: cat?.color ?? '#94a3b8', icon: cat?.icon ?? 'tag', amount, percentage: total > 0 ? (amount / total) * 100 : 0 }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [currentTxs, categories])

  const incomeBreakdown = useMemo(() => {
    const txs = currentTxs.filter(t => t.type === 'income')
    const total = txs.reduce((s, t) => s + t.amount, 0)
    const map = new Map<string, number>()
    txs.forEach(t => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId)
        return { categoryId: catId, category: cat?.name ?? 'Unknown', color: cat?.color ?? '#94a3b8', icon: cat?.icon ?? 'tag', amount, percentage: total > 0 ? (amount / total) * 100 : 0 }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [currentTxs, categories])

  // ── Day-by-day chart data ────────────────────────────────
  const dailyData = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const iso = `${selectedMonth}-${String(day).padStart(2, '0')}`
      return {
        day: String(day),
        expense: currentTxs.filter(t => t.type === 'expense' && t.date === iso).reduce((s, t) => s + t.amount, 0),
        income:  currentTxs.filter(t => t.type === 'income'  && t.date === iso).reduce((s, t) => s + t.amount, 0)
      }
    })
  }, [currentTxs, selectedMonth])

  // ── Top 5 biggest expense transactions ──────────────────
  const topExpenses = useMemo(() =>
    currentTxs.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5),
    [currentTxs])

  // ── 12-month bar chart data ──────────────────────────────
  const monthlyData = useMemo(() =>
    months.map(month => ({
      month: getMonthLabel(month),
      income:   transactions.filter(t => t.type === 'income'  && getMonthKey(t.date) === month).reduce((s, t) => s + t.amount, 0),
      expenses: transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === month).reduce((s, t) => s + t.amount, 0)
    })), [transactions, months, getMonthLabel])

  // ── Budget tracker ───────────────────────────────────────
  const budgetItems = useMemo(() =>
    categories
      .filter(c => c.type === 'expense' && c.budget && c.budget > 0)
      .map(c => {
        const spent = currentTxs.filter(t => t.type === 'expense' && t.category === c.id).reduce((s, t) => s + t.amount, 0)
        const pct = Math.min((spent / c.budget!) * 100, 100)
        return { cat: c, spent, pct, over: spent > c.budget! }
      }),
    [categories, currentTxs])

  const handleExportCSV = async () => {
    const ok = await exportCSV()
    if (ok) toast('CSV exported successfully')
    else toast('Export cancelled', 'info')
  }

  return (
    <div className="page page-enter">
      {/* Header */}
      <div className="rp-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Financial analytics — {getMonthLabel(selectedMonth)}</p>
        </div>
        <button className="btn-export" onClick={handleExportCSV}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Month selector */}
      <div className="month-tabs card-appear">
        {months.map(m => (
          <button key={m} className={`month-tab ${selectedMonth === m ? 'month-tab--active' : ''}`} onClick={() => setSelectedMonth(m)}>
            {getMonthLabel(m)}
          </button>
        ))}
      </div>

      {/* ── KPI cards ──────────────────────────────────────── */}
      <div className="kpi-grid card-appear">
        {[
          { label: 'Income', value: fmt(monthIncome), color: 'var(--income)', bg: 'var(--income-dim)', Icon: TrendingUp, prev: prevIncome, cur: monthIncome, goodIfPos: true },
          { label: 'Expenses', value: fmt(monthExpenses), color: 'var(--expense)', bg: 'var(--expense-dim)', Icon: TrendingDown, prev: prevExpenses, cur: monthExpenses, goodIfPos: false },
          { label: 'Net Balance', value: fmt(Math.abs(monthNet)), color: monthNet >= 0 ? 'var(--income)' : 'var(--expense)', bg: monthNet >= 0 ? 'var(--income-dim)' : 'var(--expense-dim)', Icon: Wallet, prev: prevIncome - prevExpenses, cur: monthNet, goodIfPos: true, prefix: monthNet < 0 ? '−' : '+' },
          { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%`, color: 'var(--accent)', bg: 'var(--accent-dim)', Icon: PiggyBank, prev: 0, cur: 0, goodIfPos: true, sub: 'of income saved' }
        ].map((card, i) => (
          <GlassCard key={i} hover>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: card.bg }}>
                <card.Icon size={17} color={card.color} />
              </div>
              <div className="kpi-body">
                <p className="kpi-label">{card.label}</p>
                <p className="kpi-value" style={{ color: card.color }}>
                  {(card as { prefix?: string }).prefix}{card.value}
                </p>
                <div className="kpi-footer">
                  {card.sub
                    ? <span className="r-delta r-delta--neutral">{card.sub}</span>
                    : <DeltaBadge cur={card.cur} prev={card.prev} goodIfPositive={card.goodIfPos} />
                  }
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ── Top categories + Expense donut ─────────────────── */}
      <div className="rp-grid card-appear">
        {/* Top spending categories */}
        <GlassCard>
          <h2 className="section-title">Top Spending Categories</h2>
          <p className="section-sub">{getMonthLabel(selectedMonth)}</p>
          {expenseBreakdown.length === 0 ? (
            <div className="empty-chart">No expenses this month</div>
          ) : (
            <div className="top-cats">
              {expenseBreakdown.map((item, i) => (
                <div key={item.categoryId} className="top-cat-row">
                  <span className="rank">#{i + 1}</span>
                  <CategoryIcon icon={item.icon} color={item.color} size={14} showBg bgSize={30} />
                  <div className="top-cat-info">
                    <div className="top-cat-meta">
                      <span className="top-cat-name">{item.category}</span>
                      <span className="top-cat-pct">{item.percentage.toFixed(1)}%</span>
                      <span className="top-cat-amt">{fmt(item.amount)}</span>
                    </div>
                    <div className="top-cat-bar-wrap">
                      <div className="top-cat-bar" style={{ width: `${item.percentage}%`, background: item.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Expense donut chart */}
        <GlassCard>
          <h2 className="section-title">Expense Breakdown</h2>
          <p className="section-sub">{getMonthLabel(selectedMonth)}</p>
          {expenseBreakdown.length === 0 ? (
            <div className="empty-chart">No expense data</div>
          ) : (
            <>
              <ExpensePieChart data={expenseBreakdown} currencySymbol={settings.currencySymbol} currencyLocale={settings.currencyLocale} />
              <div className="pie-legend">
                {expenseBreakdown.slice(0, 6).map(item => (
                  <div key={item.categoryId} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: item.color }} />
                    <span className="pie-legend-name">{item.category}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* ── Daily spending chart ────────────────────────────── */}
      <GlassCard className="card-appear">
        <h2 className="section-title">Daily Activity</h2>
        <p className="section-sub">Spending and income day by day — {getMonthLabel(selectedMonth)}</p>
        <div style={{ marginTop: 16 }}>
          <DailySpendingChart data={dailyData} currencySymbol={settings.currencySymbol} currencyLocale={settings.currencyLocale} />
        </div>
      </GlassCard>

      {/* ── Income sources + Biggest transactions ──────────── */}
      <div className="rp-grid card-appear">
        {/* Income sources */}
        <GlassCard>
          <h2 className="section-title">Income Sources</h2>
          <p className="section-sub">{getMonthLabel(selectedMonth)}</p>
          {incomeBreakdown.length === 0 ? (
            <div className="empty-chart">No income this month</div>
          ) : (
            <div className="breakdown-list" style={{ marginTop: 14 }}>
              {incomeBreakdown.map(item => (
                <div key={item.categoryId} className="breakdown-row">
                  <CategoryIcon icon={item.icon} color={item.color} size={13} showBg bgSize={28} />
                  <span className="breakdown-name">{item.category}</span>
                  <div className="breakdown-bar-wrap">
                    <div className="breakdown-bar" style={{ width: `${item.percentage}%`, background: item.color }} />
                  </div>
                  <span className="breakdown-pct">{item.percentage.toFixed(0)}%</span>
                  <span className="breakdown-amt">{fmt(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Top 5 biggest transactions */}
        <GlassCard>
          <h2 className="section-title">Biggest Expenses</h2>
          <p className="section-sub">Top 5 single transactions this month</p>
          {topExpenses.length === 0 ? (
            <div className="empty-chart">No expenses this month</div>
          ) : (
            <div className="big-tx-list">
              {topExpenses.map((t, i) => {
                const cat = categories.find(c => c.id === t.category)
                return (
                  <div key={t.id} className="big-tx-row">
                    <span className="rank rank--expense">#{i + 1}</span>
                    <CategoryIcon icon={cat?.icon ?? 'tag'} color={cat?.color ?? '#94a3b8'} size={13} showBg bgSize={30} />
                    <div className="big-tx-info">
                      <span className="big-tx-name">{cat?.name ?? 'Unknown'}</span>
                      {t.note && <span className="big-tx-note">{t.note}</span>}
                    </div>
                    <div className="big-tx-right">
                      <span className="big-tx-amt">−{fmt(t.amount)}</span>
                      <span className="big-tx-date">{formatDateShort(t.date)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── 12-month overview ───────────────────────────────── */}
      <GlassCard className="card-appear" style={{ gridColumn: '1 / -1' }}>
        <h2 className="section-title">12-Month Overview</h2>
        <p className="section-sub">Income vs expenses trend</p>
        <div style={{ marginTop: 16 }}>
          <MonthlyBarChart data={monthlyData} currencySymbol={settings.currencySymbol} currencyLocale={settings.currencyLocale} />
        </div>
      </GlassCard>

      {/* ── Budget tracker ──────────────────────────────────── */}
      {budgetItems.length > 0 && (
        <GlassCard className="card-appear">
          <h2 className="section-title">Budget Tracker</h2>
          <p className="section-sub">{getMonthLabel(selectedMonth)} — spending vs limits</p>
          <div className="budget-grid">
            {budgetItems.map(({ cat, spent, pct, over }) => (
              <div key={cat.id} className="budget-item">
                <div className="budget-item__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CategoryIcon icon={cat.icon} color={cat.color} size={13} showBg bgSize={26} />
                    <span className="budget-item__name">{cat.name}</span>
                  </div>
                  <span className="budget-item__amounts" style={{ color: over ? 'var(--expense)' : 'var(--text-secondary)' }}>
                    {fmt(spent)} / {fmt(cat.budget!)}
                  </span>
                </div>
                <div className="budget-bar-wrap">
                  <div className="budget-bar" style={{ width: `${pct}%`, background: over ? 'var(--expense)' : pct > 80 ? 'var(--warning)' : cat.color }} />
                </div>
                <div className="budget-item__footer">
                  <span style={{ fontSize: 11, color: over ? 'var(--expense)' : 'var(--text-muted)' }}>
                    {over ? `${fmt(spent - cat.budget!)} over budget` : `${fmt(cat.budget! - spent)} remaining`}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <style>{`
        .rp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .page-title {
          font-size: 26px; font-weight: 700; letter-spacing: -0.5px;
          background: linear-gradient(135deg, #e8eaff 0%, rgba(255,255,255,0.65) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
        .btn-export { display: flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: var(--radius-md); background: var(--glass-bg); color: var(--text-secondary); font-size: 14px; font-weight: 500; border: 1px solid var(--glass-border); cursor: pointer; transition: all var(--transition); }
        .btn-export:hover { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }

        /* Month tabs */
        .month-tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 4px; }
        .month-tab { padding: 7px 13px; border-radius: var(--radius-sm); background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all var(--transition); white-space: nowrap; flex-shrink: 0; }
        .month-tab:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .month-tab--active { background: var(--accent-dim); color: var(--accent); border-color: var(--glass-border-accent); }

        /* KPI cards */
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        .kpi-card { display: flex; align-items: flex-start; gap: 12px; }
        .kpi-icon { width: 38px; height: 38px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .kpi-body { flex: 1; min-width: 0; }
        .kpi-label { font-size: 11px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value { font-size: 19px; font-weight: 700; margin: 4px 0 3px; font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
        .kpi-footer { display: flex; align-items: center; }
        .r-delta { display: flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 500; }
        .r-delta--good { color: var(--income); }
        .r-delta--bad { color: var(--expense); }
        .r-delta--neutral { color: var(--text-muted); }

        /* 2-column grid for analysis sections */
        .rp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 900px) { .rp-grid { grid-template-columns: 1fr; } }
        .section-title { font-size: 15px; font-weight: 600; }
        .section-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; margin-bottom: 14px; }
        .empty-chart { text-align: center; padding: 50px 20px; color: var(--text-muted); font-size: 13px; }

        /* Top categories */
        .top-cats { display: flex; flex-direction: column; gap: 10px; }
        .top-cat-row { display: flex; align-items: center; gap: 10px; }
        .rank { font-size: 11px; font-weight: 700; color: var(--text-muted); min-width: 20px; text-align: right; }
        .rank--expense { color: var(--expense); }
        .top-cat-info { flex: 1; min-width: 0; }
        .top-cat-meta { display: flex; align-items: baseline; gap: 6px; margin-bottom: 5px; }
        .top-cat-name { font-size: 13px; font-weight: 500; color: var(--text-primary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .top-cat-pct { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
        .top-cat-amt { font-size: 13px; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .top-cat-bar-wrap { height: 4px; background: var(--glass-bg-hover); border-radius: 2px; overflow: hidden; }
        .top-cat-bar { height: 100%; border-radius: 2px; transition: width 0.5s var(--ease-out); }

        /* Pie legend */
        .pie-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; padding: 4px 2px 0; }
        .pie-legend-item { display: flex; align-items: center; gap: 6px; }
        .pie-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pie-legend-name { font-size: 11px; color: var(--text-secondary); }

        /* Income breakdown rows */
        .breakdown-list { display: flex; flex-direction: column; gap: 8px; }
        .breakdown-row { display: flex; align-items: center; gap: 10px; }
        .breakdown-name { font-size: 13px; font-weight: 500; color: var(--text-primary); min-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .breakdown-bar-wrap { flex: 1; height: 5px; background: var(--glass-bg); border-radius: 3px; overflow: hidden; }
        .breakdown-bar { height: 100%; border-radius: 3px; transition: width 0.5s var(--ease-out); }
        .breakdown-pct { font-size: 12px; color: var(--text-muted); min-width: 34px; text-align: right; }
        .breakdown-amt { font-size: 13px; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; min-width: 76px; text-align: right; }

        /* Biggest transactions */
        .big-tx-list { display: flex; flex-direction: column; gap: 8px; }
        .big-tx-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md); }
        .big-tx-info { flex: 1; min-width: 0; }
        .big-tx-name { display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .big-tx-note { display: block; font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .big-tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
        .big-tx-amt { font-size: 13px; font-weight: 700; color: var(--expense); font-variant-numeric: tabular-nums; }
        .big-tx-date { font-size: 11px; color: var(--text-muted); }

        /* Budget tracker */
        .budget-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-top: 16px; }
        .budget-item { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md); }
        .budget-item__header { display: flex; align-items: center; justify-content: space-between; }
        .budget-item__name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .budget-item__amounts { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .budget-bar-wrap { height: 6px; background: var(--glass-bg-hover); border-radius: 3px; overflow: hidden; }
        .budget-bar { height: 100%; border-radius: 3px; transition: width 0.6s var(--ease-out); }
        .budget-item__footer { display: flex; justify-content: space-between; }
      `}</style>
    </div>
  )
}
