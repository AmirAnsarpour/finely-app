import React, { useState, useMemo, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, Minus, BarChart2, PieChart, Activity, Tag, Sparkles } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import MarkdownView from '../components/MarkdownView'
import { MonthlyBarChart, ExpensePieChart, DailySpendingChart } from '../components/Chart'
import CategoryIcon from '../components/CategoryIcon'
import type { UseDataReturn } from '../hooks/useData'
import { formatCurrency } from '../utils/formatters'
import { useCalendar } from '../utils/calendarContext'
import { useToast } from '../components/Toast'
import { formatPriceValue } from '../utils/investmentPricing'
import { fileManager } from '../utils/fileManager'
import { askAI, languageInstruction, MARKDOWN_FORMAT_INSTRUCTION } from '../utils/aiClient'

interface Props { data: UseDataReturn }

function EmptyChart({ icon: Icon, message, hint }: { icon: React.ElementType; message: string; hint?: string }) {
  return (
    <div className="empty-chart">
      <Icon size={28} style={{ opacity: 0.25, marginBottom: 8 }} />
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>
      {hint && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', opacity: 0.65 }}>{hint}</p>}
    </div>
  )
}

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

function MonthNav({
  months, selected, onChange, currentMonth, formatLabel,
}: {
  months: string[]
  selected: string
  onChange: (m: string) => void
  currentMonth: string
  formatLabel: (m: string) => string
}) {
  const idx = months.indexOf(selected)
  const canPrev = idx > 0
  const canNext = idx < months.length - 1
  const isCurrent = selected === currentMonth
  return (
    <div className="mnav card-appear">
      <button className="mnav__arrow" onClick={() => canPrev && onChange(months[idx - 1])} disabled={!canPrev} aria-label="Previous month">
        ‹
      </button>
      <div className="mnav__center">
        <span className="mnav__label">{formatLabel(selected)}</span>
        {isCurrent && <span className="mnav__current-badge">Current</span>}
      </div>
      <button className="mnav__arrow" onClick={() => canNext && onChange(months[idx + 1])} disabled={!canNext} aria-label="Next month">
        ›
      </button>
      {!isCurrent && (
        <button className="mnav__jump" onClick={() => onChange(months[months.length - 1])}>
          ↩ Current month
        </button>
      )}
    </div>
  )
}

export default function Reports({ data }: Props) {
  const { transactions, categories, settings, investments, exportCSV } = data
  const { toast } = useToast()
  const {
    calendarType, formatDateShort, getMonthLabel, formatMonthYear,
    getMonthKey, currentMonthKey, getLast12Months, getLast6Months, previousMonthKey,
    getDaysInMonth, dayISO,
  } = useCalendar()

  const months = useMemo(() => getLast12Months(), [calendarType])

  // ── AI category drill-down — self-contained, no aiData prop needed ──
  const [hasAIKey, setHasAIKey] = useState(false)
  useEffect(() => { fileManager.aiHasKey().then(setHasAIKey) }, [])
  const [drilldown, setDrilldown] = useState<{ id: string; name: string } | null>(null)
  const [drilldownContent, setDrilldownContent] = useState<string | null>(null)
  const [drilldownLoading, setDrilldownLoading] = useState(false)
  const [drilldownError, setDrilldownError] = useState<string | null>(null)

  const handleAskAboutCategory = async (categoryId: string, categoryName: string) => {
    setDrilldown({ id: categoryId, name: categoryName })
    setDrilldownContent(null)
    setDrilldownError(null)
    setDrilldownLoading(true)
    try {
      const lines = [`Currency: ${settings.currencySymbol}`, `Category: ${categoryName}`]
      getLast6Months().forEach(mk => {
        const amt = transactions
          .filter(t => t.type === 'expense' && t.category === categoryId && getMonthKey(t.date) === mk)
          .reduce((s, t) => s + t.amount, 0)
        lines.push(`${getMonthLabel(mk)} (${mk}): ${amt.toFixed(2)}`)
      })
      const systemPrompt =
        `You are a personal finance analyst. You receive one expense category's monthly totals over recent months — ` +
        `no transaction-level detail. In 2-4 short sentences, explain why this category might be trending the way it ` +
        `is and give one concrete, specific suggestion to manage it better. ${languageInstruction(settings)}\n\n` +
        MARKDOWN_FORMAT_INSTRUCTION
      const content = await askAI(settings, 'category-drilldown', systemPrompt, lines.join('\n'))
      setDrilldownContent(content)
    } catch (err) {
      setDrilldownError(err instanceof Error ? err.message : 'Failed to get analysis')
    } finally {
      setDrilldownLoading(false)
    }
  }
  const [selectedMonth, setSelectedMonth] = useState(() => months[months.length - 1])
  const [selectedYear, setSelectedYear] = useState(() => parseInt(currentMonthKey().slice(0, 4)))
  const [tagScope, setTagScope] = useState<'month' | 'all'>('month')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Reset selected month whenever the calendar system changes
  useEffect(() => {
    setSelectedMonth(months[months.length - 1])
  }, [months])

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
  const prevMonth = useMemo(() => previousMonthKey(selectedMonth), [previousMonthKey, selectedMonth])
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
    const daysInMonth = getDaysInMonth(selectedMonth)
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const iso = dayISO(selectedMonth, day)
      return {
        day: String(day),
        expense: currentTxs.filter(t => t.type === 'expense' && t.date === iso).reduce((s, t) => s + t.amount, 0),
        income:  currentTxs.filter(t => t.type === 'income'  && t.date === iso).reduce((s, t) => s + t.amount, 0)
      }
    })
  }, [currentTxs, selectedMonth, getDaysInMonth, dayISO])

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
    })), [transactions, months, getMonthKey, getMonthLabel])

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

  // ── Tag analysis ────────────────────────────────────────
  const tagScopedTxs = tagScope === 'month' ? currentTxs : transactions

  const tagStats = useMemo(() => {
    const map = new Map<string, { count: number; income: number; expenses: number }>()
    tagScopedTxs.forEach(t => {
      t.tags?.forEach(tag => {
        const e = map.get(tag) ?? { count: 0, income: 0, expenses: 0 }
        map.set(tag, {
          count: e.count + 1,
          income: e.income + (t.type === 'income' ? t.amount : 0),
          expenses: e.expenses + (t.type === 'expense' ? t.amount : 0),
        })
      })
    })
    return Array.from(map.entries())
      .map(([tag, s]) => ({ tag, ...s, net: s.income - s.expenses }))
      .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses))
  }, [tagScopedTxs])

  const tagTxs = useMemo(() =>
    selectedTag
      ? tagScopedTxs.filter(t => t.tags?.includes(selectedTag)).sort((a, b) => b.date.localeCompare(a.date))
      : [],
    [tagScopedTxs, selectedTag])

  // ── Investment activity (Toman value at time of each transaction) ─
  const investmentTxs = useMemo(() =>
    investments.flatMap(inv => inv.transactions.map(tx => ({
      date: tx.date,
      // Buys add to invested capital, sells return capital — net them by sign.
      value: tx.valueTomanAtTime == null ? null : (tx.type === 'sell' ? -tx.valueTomanAtTime : tx.valueTomanAtTime),
    }))),
    [investments])

  const hasUntrackedInvestmentTx = useMemo(() =>
    investmentTxs.some(tx => tx.value == null),
    [investmentTxs])

  const monthInvested = useMemo(() =>
    investmentTxs
      .filter(tx => tx.value != null && getMonthKey(tx.date) === selectedMonth)
      .reduce((s, tx) => s + (tx.value as number), 0),
    [investmentTxs, selectedMonth, getMonthKey])

  const totalInvested = useMemo(() =>
    investmentTxs
      .filter(tx => tx.value != null)
      .reduce((s, tx) => s + (tx.value as number), 0),
    [investmentTxs])

  const hasTrackedInvestmentTx = useMemo(() =>
    investmentTxs.some(tx => tx.value != null),
    [investmentTxs])

  // ── Yearly overview ──────────────────────────────────────
  const yearlyData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const key = `${selectedYear}-${String(i + 1).padStart(2, '0')}`
      const txs = transactions.filter(t => getMonthKey(t.date) === key)
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const net = income - expenses
      const savingsRate = income > 0 ? (net / income) * 100 : 0
      const invested = investmentTxs
        .filter(tx => tx.value != null && getMonthKey(tx.date) === key)
        .reduce((s, tx) => s + (tx.value as number), 0)
      return { monthNum: i + 1, key, income, expenses, net, savingsRate, invested, empty: txs.length === 0 }
    }),
    [transactions, investmentTxs, selectedYear, getMonthKey])

  const yearlyTotals = useMemo(() => {
    const income = yearlyData.reduce((s, r) => s + r.income, 0)
    const expenses = yearlyData.reduce((s, r) => s + r.expenses, 0)
    const net = income - expenses
    const savingsRate = income > 0 ? (net / income) * 100 : 0
    const invested = yearlyData.reduce((s, r) => s + r.invested, 0)
    return { income, expenses, net, savingsRate, invested }
  }, [yearlyData])

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
          <p className="page-sub">Financial analytics — {formatMonthYear(selectedMonth)}</p>
        </div>
        <button className="btn-export" onClick={handleExportCSV}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Month navigator */}
      <MonthNav
        months={months}
        selected={selectedMonth}
        onChange={setSelectedMonth}
        currentMonth={currentMonthKey()}
        formatLabel={formatMonthYear}
      />

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
          <p className="section-sub">{formatMonthYear(selectedMonth)}</p>
          {expenseBreakdown.length === 0 ? (
            <EmptyChart icon={TrendingDown} message="No expenses this month" hint="Add transactions to see your spending breakdown" />
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
                  {hasAIKey && (
                    <button
                      className="icon-action"
                      onClick={() => handleAskAboutCategory(item.categoryId, item.category)}
                      title={`Ask AI about ${item.category}`}
                      style={{ flexShrink: 0 }}
                    >
                      <Sparkles size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Expense donut chart */}
        <GlassCard>
          <h2 className="section-title">Expense Breakdown</h2>
          <p className="section-sub">{formatMonthYear(selectedMonth)}</p>
          {expenseBreakdown.length === 0 ? (
            <EmptyChart icon={PieChart} message="No expense data" hint="Your category breakdown will appear here" />
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
        <p className="section-sub">Spending and income day by day — {formatMonthYear(selectedMonth)}</p>
        <div style={{ marginTop: 16 }}>
          <DailySpendingChart data={dailyData} currencySymbol={settings.currencySymbol} currencyLocale={settings.currencyLocale} />
        </div>
      </GlassCard>

      {/* ── Income sources + Biggest transactions ──────────── */}
      <div className="rp-grid card-appear">
        {/* Income sources */}
        <GlassCard>
          <h2 className="section-title">Income Sources</h2>
          <p className="section-sub">{formatMonthYear(selectedMonth)}</p>
          {incomeBreakdown.length === 0 ? (
            <EmptyChart icon={TrendingUp} message="No income this month" hint="Income transactions will appear here" />
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
            <EmptyChart icon={Activity} message="No expenses this month" hint="Your largest single transactions will appear here" />
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

      {/* ── Invested ────────────────────────────────────────── */}
      {investments.length > 0 && (
        <GlassCard className="card-appear">
          <h2 className="section-title">Invested</h2>
          <p className="section-sub">Value of your investment activity (T), at original entry prices</p>
          <div className="nw-strip" style={{ marginTop: 14 }}>
            <div className="nw-col">
              <span className="nw-label">{formatMonthYear(selectedMonth)}</span>
              <span className="nw-value" style={{ color: monthInvested >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {monthInvested < 0 ? '−' : '+'}{formatPriceValue(Math.abs(monthInvested), 'IRT')}
              </span>
            </div>
            <div className="nw-divider" />
            <div className="nw-col">
              <span className="nw-label">All time</span>
              <span className="nw-value" style={{ color: totalInvested >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {totalInvested < 0 ? '−' : '+'}{formatPriceValue(Math.abs(totalInvested), 'IRT')}
              </span>
            </div>
          </div>
          {!hasTrackedInvestmentTx ? (
            <p style={{ marginTop: 14, marginBottom: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              No price data captured yet — buys and sells are tracked from the moment they're recorded.
            </p>
          ) : hasUntrackedInvestmentTx ? (
            <p style={{ marginTop: 14, marginBottom: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              Some older entries don't have a captured price and aren't included in these totals.
            </p>
          ) : null}
        </GlassCard>
      )}

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
          <p className="section-sub">{formatMonthYear(selectedMonth)} — spending vs limits</p>
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

      {/* ── Tag analysis ────────────────────────────────────── */}
      {(tagStats.length > 0 || transactions.some(t => t.tags && t.tags.length > 0)) && (
        <GlassCard className="card-appear" style={{ marginTop: 0 }}>
          <div className="ta-header">
            <div className="ta-title-row">
              <div className="ta-icon-wrap"><Tag size={15} color="var(--accent)" /></div>
              <div>
                <h2 className="section-title">Tag Analysis</h2>
                <p className="section-sub" style={{ marginBottom: 0 }}>Spending and income by tag</p>
              </div>
            </div>
            <div className="ta-scope-toggle">
              {(['month', 'all'] as const).map(s => (
                <button key={s}
                  className={`ta-scope-btn ${tagScope === s ? 'ta-scope-btn--active' : ''}`}
                  onClick={() => { setTagScope(s); setSelectedTag(null) }}>
                  {s === 'month' ? 'This month' : 'All time'}
                </button>
              ))}
            </div>
          </div>

          {tagStats.length === 0 ? (
            <div className="ta-empty">
              <Tag size={24} style={{ opacity: 0.2 }} />
              <p>No tagged transactions {tagScope === 'month' ? 'this month' : 'yet'}</p>
              <span>Add tags when recording transactions to analyze them here</span>
            </div>
          ) : (
            <>
              {/* Tag cloud */}
              <div className="ta-cloud">
                {tagStats.map(ts => (
                  <button key={ts.tag}
                    className={`ta-cloud-pill ${selectedTag === ts.tag ? 'ta-cloud-pill--active' : ''}`}
                    onClick={() => setSelectedTag(selectedTag === ts.tag ? null : ts.tag)}>
                    <span className="ta-cloud-hash">#</span>{ts.tag}
                    <span className="ta-cloud-badge">{ts.count}</span>
                  </button>
                ))}
              </div>

              {/* Stats table */}
              <div className="ta-table-wrap">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th className="ta-th">Tag</th>
                      <th className="ta-th ta-th--num">Txns</th>
                      <th className="ta-th ta-th--num">Income</th>
                      <th className="ta-th ta-th--num">Expenses</th>
                      <th className="ta-th ta-th--num">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tagStats.map(ts => (
                      <tr key={ts.tag}
                        className={`ta-tr ${selectedTag === ts.tag ? 'ta-tr--selected' : ''}`}
                        onClick={() => setSelectedTag(selectedTag === ts.tag ? null : ts.tag)}>
                        <td className="ta-td">
                          <span className="ta-tag-name"><span className="ta-tag-hash">#</span>{ts.tag}</span>
                        </td>
                        <td className="ta-td ta-td--num ta-td--muted">{ts.count}</td>
                        <td className="ta-td ta-td--num" style={{ color: ts.income > 0 ? 'var(--income)' : undefined }}>
                          {ts.income > 0 ? fmt(ts.income) : <span className="ta-dash">—</span>}
                        </td>
                        <td className="ta-td ta-td--num" style={{ color: ts.expenses > 0 ? 'var(--expense)' : undefined }}>
                          {ts.expenses > 0 ? fmt(ts.expenses) : <span className="ta-dash">—</span>}
                        </td>
                        <td className="ta-td ta-td--num ta-td--net" style={{ color: ts.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                          {ts.net >= 0 ? '+' : '−'}{fmt(Math.abs(ts.net))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected-tag drill-down */}
              {selectedTag && tagTxs.length > 0 && (
                <div className="ta-drilldown">
                  <div className="ta-drilldown-label">
                    <span className="ta-drilldown-tag"><span style={{ opacity: 0.55 }}>#</span>{selectedTag}</span>
                    <span className="ta-drilldown-count">{tagTxs.length} transaction{tagTxs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="ta-tx-list">
                    {tagTxs.slice(0, 12).map(t => {
                      const cat = categories.find(c => c.id === t.category)
                      return (
                        <div key={t.id} className="ta-tx-row">
                          <CategoryIcon icon={cat?.icon ?? 'tag'} color={cat?.color ?? '#94a3b8'} size={13} showBg bgSize={28} />
                          <div className="ta-tx-info">
                            <span className="ta-tx-cat">{cat?.name ?? 'Unknown'}</span>
                            {t.note && <span className="ta-tx-note">{t.note}</span>}
                          </div>
                          <span className={`ta-tx-amt ${t.type}`}>{t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '⇄'}{fmt(t.amount)}</span>
                          <span className="ta-tx-date">{formatDateShort(t.date)}</span>
                        </div>
                      )
                    })}
                    {tagTxs.length > 12 && (
                      <p className="ta-more">+{tagTxs.length - 12} more</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </GlassCard>
      )}

      {/* ── Yearly overview ─────────────────────────────────── */}
      <GlassCard className="card-appear" style={{ marginTop: 16 }}>
        <div className="yr-header">
          <div>
            <h2 className="section-title">Yearly Overview</h2>
            <p className="section-sub">Month-by-month breakdown for {selectedYear}</p>
          </div>
          <div className="yr-nav">
            <button className="yr-nav-btn" onClick={() => setSelectedYear(y => y - 1)}>‹</button>
            <span className="yr-nav-label">{selectedYear}</span>
            <button className="yr-nav-btn" onClick={() => setSelectedYear(y => y + 1)}>›</button>
          </div>
        </div>
        <div className="yr-table-wrap">
          <table className="yr-table">
            <thead>
              <tr>
                <th className="yr-th yr-th--month">Month</th>
                <th className="yr-th yr-th--num">Income</th>
                <th className="yr-th yr-th--num">Expenses</th>
                <th className="yr-th yr-th--num">Net</th>
                <th className="yr-th yr-th--num">Savings Rate</th>
                {investments.length > 0 && <th className="yr-th yr-th--num">Invested</th>}
              </tr>
            </thead>
            <tbody>
              {yearlyData.map(row => (
                <tr key={row.key} className={`yr-tr ${row.empty ? 'yr-tr--empty' : ''}`}>
                  <td className="yr-td yr-td--month">{getMonthLabel(row.key)}</td>
                  <td className="yr-td yr-td--num">{row.empty ? '—' : fmt(row.income)}</td>
                  <td className="yr-td yr-td--num">{row.empty ? '—' : fmt(row.expenses)}</td>
                  <td className="yr-td yr-td--num" style={{ color: row.empty ? undefined : row.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {row.empty ? '—' : (row.net < 0 ? '−' : '+') + fmt(Math.abs(row.net))}
                  </td>
                  <td className="yr-td yr-td--num">{row.empty ? '—' : `${row.savingsRate.toFixed(1)}%`}</td>
                  {investments.length > 0 && (
                    <td className="yr-td yr-td--num" style={{ color: row.invested === 0 ? undefined : row.invested > 0 ? 'var(--income)' : 'var(--expense)' }}>
                      {row.invested === 0 ? '—' : (row.invested < 0 ? '−' : '+') + formatPriceValue(Math.abs(row.invested), 'IRT')}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="yr-tr yr-tr--total">
                <td className="yr-td yr-td--month">Total</td>
                <td className="yr-td yr-td--num">{fmt(yearlyTotals.income)}</td>
                <td className="yr-td yr-td--num">{fmt(yearlyTotals.expenses)}</td>
                <td className="yr-td yr-td--num" style={{ color: yearlyTotals.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                  {(yearlyTotals.net < 0 ? '−' : '+') + fmt(Math.abs(yearlyTotals.net))}
                </td>
                <td className="yr-td yr-td--num">{`${yearlyTotals.savingsRate.toFixed(1)}%`}</td>
                {investments.length > 0 && (
                  <td className="yr-td yr-td--num" style={{ color: yearlyTotals.invested === 0 ? undefined : yearlyTotals.invested > 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {yearlyTotals.invested === 0 ? '—' : (yearlyTotals.invested < 0 ? '−' : '+') + formatPriceValue(Math.abs(yearlyTotals.invested), 'IRT')}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>

      <Modal open={!!drilldown} onClose={() => setDrilldown(null)} title={drilldown ? `AI: ${drilldown.name}` : 'AI'} width={480}>
        {drilldownLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" />
          </div>
        )}
        {drilldownError && <p className="form-error">{drilldownError}</p>}
        {drilldownContent && <MarkdownView content={drilldownContent} />}
      </Modal>
    </div>
  )
}
