import React, { useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import TransactionItem from '../components/TransactionItem'
import CategoryIcon from '../components/CategoryIcon'
import SkeletonRow from '../components/SkeletonRow'
import { MonthlyBarChart } from '../components/Chart'
import type { UseDataReturn } from '../hooks/useData'
import { formatCurrency } from '../utils/formatters'
import { useCalendar } from '../utils/calendarContext'
import { useCountUp } from '../components/AnimatedNumber'
import { useInvestmentPrices } from '../hooks/useInvestmentPrices'
import { formatPriceValue } from '../utils/investmentPricing'

interface Props { data: UseDataReturn }

export default function Dashboard({ data }: Props) {
  const { transactions, categories, settings, goals, installments, investments, refreshing } = data
  const {
    getMonthKey, currentMonthKey, previousMonthKey,
    getLast6Months, getMonthLabel, formatMonthYear,
  } = useCalendar()

  const currentMonth = currentMonthKey()
  const lastMonth = useMemo(() => previousMonthKey(currentMonth), [previousMonthKey, currentMonth])

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
      income:   transactions.filter(t => t.type === 'income'  && getMonthKey(t.date) === month).reduce((s, t) => s + t.amount, 0),
      expenses: transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === month).reduce((s, t) => s + t.amount, 0)
    })), [transactions, getLast6Months, getMonthKey, getMonthLabel])

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

  const netWorthData = useMemo(() => {
    const liquidBalance = transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
    const goalSavings = goals.reduce((s, g) => s + g.currentAmount, 0)
    const remainingDebt = installments.reduce((s, inst) =>
      s + inst.payments.filter(p => !p.isPaid).reduce((ps, p) => ps + p.amount, 0), 0)
    const netWorth = liquidBalance + goalSavings - remainingDebt
    return { liquidBalance, goalSavings, remainingDebt, netWorth }
  }, [transactions, goals, installments])

  const investmentCurrency = settings.investmentCurrency
  const { prices: investmentPrices } = useInvestmentPrices(investments, investmentCurrency)
  const portfolioValue = useMemo(() => {
    let total = 0
    let hasAny = false
    for (const inv of investments) {
      const price = investmentPrices[inv.assetId]
      if (price == null) continue
      total += inv.quantity * price
      hasAny = true
    }
    return hasAny ? total : null
  }, [investments, investmentPrices])

  // Animated values for stat cards
  const animIncome   = useCountUp(monthlyTotals.income)
  const animExpenses = useCountUp(monthlyTotals.expenses)
  const animNet      = useCountUp(Math.abs(monthlyTotals.net))
  const animSavings  = useCountUp(monthlyTotals.savingsRate)

  const summaryCards = [
    {
      label: 'Total Income',
      value: fmt(animIncome),
      icon: TrendingUp,
      color: 'var(--income)',
      bg: 'var(--income-dim)',
      delta: delta(monthlyTotals.income, lastMonthTotals.income),
      deltaGoodIfPositive: true
    },
    {
      label: 'Total Expenses',
      value: fmt(animExpenses),
      icon: TrendingDown,
      color: 'var(--expense)',
      bg: 'var(--expense-dim)',
      delta: delta(monthlyTotals.expenses, lastMonthTotals.expenses),
      deltaGoodIfPositive: false
    },
    {
      label: 'Net Balance',
      value: fmt(animNet),
      icon: Wallet,
      color: monthlyTotals.net >= 0 ? 'var(--income)' : 'var(--expense)',
      bg: monthlyTotals.net >= 0 ? 'var(--income-dim)' : 'var(--expense-dim)',
      prefix: monthlyTotals.net < 0 ? '−' : '+',
      sub: monthlyTotals.net >= 0 ? 'Surplus' : 'Deficit',
      delta: null
    },
    {
      label: 'Savings Rate',
      value: `${animSavings.toFixed(1)}%`,
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
          <p className="page-sub">Financial overview for {formatMonthYear(currentMonth)}</p>
        </div>
      </div>

      {/* Net worth strip */}
      {(transactions.length > 0 || investments.length > 0) && (
        <GlassCard className="card-appear" style={{ marginBottom: 16 }}>
          <div className="nw-strip">
            <div className="nw-col">
              <span className="nw-label">Liquid Balance</span>
              <span className="nw-value">{fmt(netWorthData.liquidBalance)}</span>
            </div>
            <div className="nw-divider" />
            <div className="nw-col">
              <span className="nw-label">Goal Savings</span>
              <span className="nw-value">{fmt(netWorthData.goalSavings)}</span>
            </div>
            <div className="nw-divider" />
            <div className="nw-col">
              <span className="nw-label">Remaining Debt</span>
              <span className="nw-value">{fmt(netWorthData.remainingDebt)}</span>
            </div>
            <div className="nw-divider" />
            <div className="nw-col">
              <span className="nw-label">Net Worth</span>
              <span className="nw-value" style={{ color: netWorthData.netWorth >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {netWorthData.netWorth < 0 ? '−' : ''}{fmt(Math.abs(netWorthData.netWorth))}
              </span>
            </div>
            {investments.length > 0 && (
              <>
                <div className="nw-divider" />
                <div className="nw-col">
                  <span className="nw-label">Portfolio Value</span>
                  <span className="nw-value" style={portfolioValue == null ? { color: 'var(--text-muted)' } : undefined}>
                    {portfolioValue == null ? '—' : formatPriceValue(portfolioValue, investmentCurrency)}
                  </span>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      )}

      {/* Getting-started banner — only shown before any transactions exist */}
      {transactions.length === 0 && !refreshing && (
        <GlassCard className="card-appear" style={{ marginBottom: 16, borderColor: 'rgba(108,142,245,0.3)' }}>
          <div className="gs-banner">
            <div className="gs-banner__icon">
              <Sparkles size={20} color="var(--accent)" />
            </div>
            <div className="gs-banner__body">
              <p className="gs-banner__title">Welcome to Finely</p>
              <p className="gs-banner__sub">
                Your categories are ready. Press <kbd className="gs-kbd">Ctrl N</kbd> to log your first transaction — income or expense — and your dashboard will come to life.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

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
                  <div className="empty-icon-ring">
                    <Wallet size={22} color="var(--accent)" />
                  </div>
                  <p className="empty-title">No transactions yet</p>
                  <span className="empty-hint">Press <kbd className="empty-kbd">Ctrl N</kbd> to add your first one</span>
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

    </div>
  )
}
