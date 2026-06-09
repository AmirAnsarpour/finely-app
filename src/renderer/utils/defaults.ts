import type { Account, Category, AppSettings } from '../types'
import { generateId } from './formatters'

export const DEFAULT_CATEGORIES: Category[] = [
  // Income
  { id: generateId(), name: 'Salary', type: 'income', color: '#4ade80', icon: 'briefcase' },
  { id: generateId(), name: 'Freelance', type: 'income', color: '#60a5fa', icon: 'code-2' },
  { id: generateId(), name: 'Investment', type: 'income', color: '#fbbf24', icon: 'trending-up' },
  { id: generateId(), name: 'Gift', type: 'income', color: '#f472b6', icon: 'gift' },
  { id: generateId(), name: 'Other Income', type: 'income', color: '#a78bfa', icon: 'dollar-sign' },
  // Expense
  { id: generateId(), name: 'Food & Dining', type: 'expense', color: '#fb923c', icon: 'utensils' },
  { id: generateId(), name: 'Transport', type: 'expense', color: '#38bdf8', icon: 'car' },
  { id: generateId(), name: 'Shopping', type: 'expense', color: '#f472b6', icon: 'shopping-bag' },
  { id: generateId(), name: 'Housing', type: 'expense', color: '#34d399', icon: 'home' },
  { id: generateId(), name: 'Entertainment', type: 'expense', color: '#c084fc', icon: 'film' },
  { id: generateId(), name: 'Healthcare', type: 'expense', color: '#f87171', icon: 'heart' },
  { id: generateId(), name: 'Education', type: 'expense', color: '#818cf8', icon: 'book-open' },
  { id: generateId(), name: 'Bills & Utilities', type: 'expense', color: '#fbbf24', icon: 'zap' },
  { id: generateId(), name: 'Other Expense', type: 'expense', color: '#94a3b8', icon: 'more-horizontal' },
]

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: generateId(), name: 'Cash',    color: '#4ade80', icon: 'wallet',     createdAt: new Date().toISOString() },
  { id: generateId(), name: 'Card',    color: '#60a5fa', icon: 'banknote',   createdAt: new Date().toISOString() },
  { id: generateId(), name: 'Savings', color: '#fbbf24', icon: 'piggy-bank', createdAt: new Date().toISOString() },
]

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  currencySymbol: '$',
  currencyLocale: 'en-US',
  theme: 'dark',
  dataFolder: '',
  calendarType: 'gregorian',
  weekStartDay: 0,
  investmentCurrency: 'USDT',
}
