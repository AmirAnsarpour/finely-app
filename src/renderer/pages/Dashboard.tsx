import React, { useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import TransactionItem from '../components/TransactionItem'
import CategoryIcon from '../components/CategoryIcon'
import SkeletonRow from '../components/SkeletonRow'
import { MonthlyBarChart } from '../components/Chart'
import type { UseDataReturn } from '../hooks/useData'
import {
  formatCurrency, getLast6Months, getMonthKey,
  currentMonthKey, previousMonthKey
} from '../utils/formatters'
import { useCalendar } from '../utils/calendarContext'

interface Props { data: UseDataReturn }

export default function Dashboard({ data }: Props) {
  const { transactions, categories, settings, refreshing } = data
  const { getMonthLabel } = useCalendar()

  const currentMonth = currentMonthKey()
  const lastMonth = useMemo(() => previousMonthKey(currentMonth), [currentMonth])

  const monthlyTotals = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income' && getMonthKey(t.date) === currentMonth).reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === currentMonth).reduce((s, t) => s + t.amount, 0)
    return { income, expenses, net: income - expenses, savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0 }
  }, [transactions, currentMonth])

  const lastMonthTotals = useMemo(() => ({
    income: transactions.filter(t => t.type === 'income' && getMonthKey(t.date) === lastMonth).reduce((s, t) => s + t.amount, 0),
    expenses: transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === lastMonth).reduce((s, t) => s + t.amount, 0),
  }), [transactions, lastMonth])

  function delta(cur: number, prev: number): number | null {
    if (prev === 0) return null
    return ((cur - prev) / prev) * 100
  }

  const chartData = useMemo(() =>
    getLast6Months().map(month => ({
      month: getMonthLabel(month),
      income: transactions.filter(t => t.type === 'income' && getMonthKey(t.date) === month).reduce((s, t) => s + t.amount, 0),
      expenses: transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === month).reduce((s, t) => s + t.amount, 0)
    })), [transactions, getMonthLabel])

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [transactions])

  // Budget progress (expense categories with a budget set)
  const budgetItems = useMemo(() => {
    return categories
      .filter(c => c.type === 'expense' && c.budget && c.budget > 0)
      .map(c => {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === c.id && getMonthKey(t.date) === currentMonth)
          .reduce((s, t) => s + t.amount, 0)
        const pct = Math.min((spent / c.budget!) * 100, 100)
        const over = spent > c.budget!
        return { ...c, spent, pct, over, warning: !over && pct >= 80 }
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4)
  }, [categories, transactions, currentMonth])

  const fmt = (n: number) => formatCurrency(n, settings.currencySymbol, settings.currencyLocale)

  const summaryCards = [
    {
      label: 'Total Income',
      value: fmt(monthlyTotals.income),
      icon: TrendingUp,
      color: 'var(--income)',
      bg: 'var(--income-dim)',
      delta: delta(monthlyTotals.income, lastMonthTotals.income),
      deltaGoodIfPositive: true
    },
    {
      label: 'Total Expenses',
      value: fmt(monthlyTotals.expenses),
      icon: TrendingDown,
      color: 'var(--expense)',
      bg: 'var(--expense-dim)',
      delta: delta(monthlyTotals.expenses, lastMonthTotals.expenses),
      deltaGoodIfPositive: false
    },
    {
      label: 'Net Balance',
      value: fmt(Math.abs(monthlyTotals.net)),
      icon: Wallet,
      color: monthlyTotals.net >= 0 ? 'var(--income)' : 'var(--expense)',
      bg: monthlyTotals.net >= 0 ? 'var(--income-dim)' : 'var(--expense-dim)',
      prefix: monthlyTotals.net < 0 ? '−' : '+',
      sub: monthlyTotals.net >= 0 ? 'Surplus' : 'Deficit',
      delta: null
    },
    {
      label: 'Savings Rate',
      value: `${monthlyTotals.savingsRate.toFixed(1)}%`,
      icon: PiggyBank,
      color: 'var(--accent)',
      bg: 'var(--accent-dim)',
      delta: null,
      sub: 'Of income saved'
    }
  ]

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Financial overview for {getMonthLabel(currentMonth)}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        {summaryCards.map((card, i) => {
          const Icon = card.icon
          const d = card.delta
          const isGood = d !== null && (card.deltaGoodIfPositive ? d >= 0 : d <= 0)
          const isBad = d !== null && !isGood
          return (
            <GlassCard key={i} className="card-appear" hover>
              <div className="summary-card">
                <div className="sc-icon" style={{ background: card.bg }}>
                  <Icon size={18} color={card.color} strokeWidth={2} />
                </div>
                <div className="sc-body">
                  <p className="sc-label">{card.label}</p>
                  <p className="sc-value" style={{ color: card.color }}>
                    {(card as { prefix?: string }).prefix}{card.value}
                  </p>
                  <div className="sc-footer">
                    {d !== null ? (
                      <span className={`sc-delta ${isGood ? 'good' : isBad ? 'bad' : ''}`}>
                        {isGood ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {Math.abs(d).toFixed(0)}% vs last month
                      </span>
                    ) : (
                      <span className="sc-sub">{card.sub ?? 'This month'}</span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <div className="dashboard-grid">
        {/* Chart */}
        <GlassCard className="card-appear chart-card">
          <h2 className="section-title">Income vs Expenses</h2>
          <p className="section-sub">Last 6 months</p>
          <div style={{ marginTop: 16 }}>
            <MonthlyBarChart data={chartData} currencySymbol={settings.currencySymbol} currencyLocale={settings.currencyLocale} />
          </div>
        </GlassCard>

        <div className="right-col">
          {/* Budget tracker */}
          {budgetItems.length > 0 && (
            <GlassCard className="card-appear" style={{ marginBottom: 14 }}>
              <h2 className="section-title">Budgets</h2>
              <p className="section-sub">This month's spending limits</p>
              <div className="budget-list">
                {budgetItems.map(b => (
                  <div key={b.id} className="budget-row">
                    <CategoryIcon icon={b.icon} color={b.color} size={13} showBg bgSize={28} />
                    <div className="budget-info">
                      <div className="budget-top">
                        <span className="budget-name">{b.name}</span>
                        <span className="budget-amt" style={{ color: b.over ? 'var(--expense)' : b.warning ? 'var(--warning)' : 'var(--text-secondary)' }}>
                          {fmt(b.spent)} / {fmt(b.budget!)}
                        </span>
                      </div>
                      <div className="budget-track">
                        <div className="budget-fill" style={{
                          width: `${b.pct}%`,
                          background: b.over ? 'var(--expense)' : b.warning ? 'var(--warning)' : b.color
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Recent transactions */}
          <GlassCard className="card-appear recent-card">
            <h2 className="section-title">Recent Transactions</h2>
            <p className="section-sub" style={{ marginBottom: 14 }}>Last 10 entries</p>
            <div className="tx-list">
              {refreshing ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : recentTransactions.length === 0 ? (
                <div className="empty-state">
                  <Wallet size={36} color="var(--text-muted)" />
                  <p>No transactions yet</p>
                  <span>Use the sidebar to add one</span>
                </div>
              ) : (
                recentTransactions.map((t, i) => (
                  <TransactionItem key={t.id} transaction={t} categories={categories} settings={settings} animDelay={i * 35} />
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <style>{`
        .page-header { margin-bottom: 20px; }
        .page-title {
          font-size: 26px; font-weight: 700; letter-spacing: -0.5px;
          background: linear-gradient(135deg, #e8eaff 0%, rgba(255,255,255,0.65) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

        /* Summary cards */
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
        .summary-card { display: flex; align-items: flex-start; gap: 12px; }
        .sc-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sc-body { flex: 1; min-width: 0; }
        .sc-label { font-size: 11px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .sc-value { font-size: 20px; font-weight: 700; margin: 4px 0 3px; font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
        .sc-footer { display: flex; align-items: center; gap: 4px; }
        .sc-delta { display: flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 500; }
        .sc-delta.good { color: var(--income); }
        .sc-delta.bad  { color: var(--expense); }
        .sc-sub { font-size: 11px; color: var(--text-secondary); }

        /* Dashboard layout */
        .dashboard-grid { display: grid; grid-template-columns: 1fr 360px; gap: 14px; }
        @media (max-width: 1100px) { .dashboard-grid { grid-template-columns: 1fr; } }
        .right-col { display: flex; flex-direction: column; gap: 0; }
        .chart-card { min-height: 340px; }
        .section-title { font-size: 14px; font-weight: 600; }
        .section-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .tx-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
        .empty-state { display: flex; flex-direction: column; align-items: center; padding: 36px 20px; gap: 8px; text-align: center; }
        .empty-state p { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
        .empty-state span { font-size: 12px; color: var(--text-muted); }

        /* Budget tracker */
        .budget-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
        .budget-row { display: flex; align-items: center; gap: 10px; }
        .budget-info { flex: 1; }
        .budget-top { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .budget-name { font-size: 12px; font-weight: 500; color: var(--text-primary); }
        .budget-amt { font-size: 11px; font-variant-numeric: tabular-nums; }
        .budget-track { height: 5px; background: var(--glass-bg); border-radius: 3px; overflow: hidden; }
        .budget-fill { height: 100%; border-radius: 3px; transition: width 0.6s var(--ease-out); }
        .recent-card { flex: 1; }
      `}</style>
    </div>
  )
}
