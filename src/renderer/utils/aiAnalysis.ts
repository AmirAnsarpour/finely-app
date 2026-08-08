import type { AppSettings, Transaction, Category } from '../types'
import { languageInstruction, MARKDOWN_FORMAT_INSTRUCTION } from './aiClient'

export interface MonthCategoryBreakdown {
  name: string
  type: 'income' | 'expense'
  amount: number
  budget?: number
}

export interface MonthSummary {
  monthKey: string
  monthLabel: string
  income: number
  expenses: number
  categories: MonthCategoryBreakdown[]
}

export interface SpendingSummaryInput {
  currencySymbol: string
  months: MonthSummary[]
}

export function buildAnalysisSystemPrompt(settings: AppSettings): string {
  return (
    `You are a personal finance analyst helping someone understand their own spending. ` +
    `You receive a per-month breakdown of income and expenses by category — no transaction-level ` +
    `descriptions, merchant names, or account names, only category totals and budgets. Using only this data, answer concretely:\n` +
    `1. What is driving increases in spending, and in which categories specifically.\n` +
    `2. Any categories trending in a concerning direction.\n` +
    `3. Specific, actionable suggestions for managing spending better, grounded in the actual numbers given.\n` +
    `Reference real numbers and percentages from the data. ${languageInstruction(settings)} ` +
    `Keep it focused — a few short sections, not a wall of text — and don't give generic advice unrelated to this data.\n\n` +
    MARKDOWN_FORMAT_INSTRUCTION
  )
}

// Builds the data sent to the AI provider from already-loaded app state.
// Deliberately excludes transaction notes, tags, and account names — only
// category-level totals per month, so the minimum needed for a useful
// analysis leaves the device.
export function buildSpendingSummary(
  transactions: Transaction[],
  categories: Category[],
  currencySymbol: string,
  monthKeys: string[],
  getMonthKey: (iso: string) => string,
  getMonthLabel: (key: string) => string
): SpendingSummaryInput {
  const months: MonthSummary[] = monthKeys.map(monthKey => {
    const monthTxs = transactions.filter(t => t.type !== 'transfer' && getMonthKey(t.date) === monthKey)
    const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const byCategory = new Map<string, number>()
    monthTxs.forEach(t => byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount))

    const categoryBreakdown: MonthCategoryBreakdown[] = Array.from(byCategory.entries())
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId)
        return { name: cat?.name ?? 'Unassigned', type: cat?.type ?? 'expense', amount, budget: cat?.budget }
      })
      .sort((a, b) => b.amount - a.amount)

    return { monthKey, monthLabel: getMonthLabel(monthKey), income, expenses, categories: categoryBreakdown }
  })

  return { currencySymbol, months }
}

export function summaryToPrompt(input: SpendingSummaryInput): string {
  const lines: string[] = [`Currency: ${input.currencySymbol}`]
  input.months.forEach(m => {
    lines.push('', `## ${m.monthLabel} (${m.monthKey})`)
    lines.push(`Income: ${m.income.toFixed(2)} | Expenses: ${m.expenses.toFixed(2)} | Net: ${(m.income - m.expenses).toFixed(2)}`)
    if (m.categories.length > 0) {
      lines.push('By category:')
      m.categories.forEach(c => {
        const budgetNote = c.budget ? ` (budget: ${c.budget.toFixed(2)})` : ''
        lines.push(`- ${c.name} [${c.type}]: ${c.amount.toFixed(2)}${budgetNote}`)
      })
    }
  })
  return lines.join('\n')
}
