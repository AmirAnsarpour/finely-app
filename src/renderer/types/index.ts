export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  note: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
  icon: string
  budget?: number
}

export interface AppSettings {
  currency: string
  currencySymbol: string
  currencyLocale: string
  theme: 'light' | 'dark' | 'black' | 'system'
  dataFolder: string
  onboardingComplete?: boolean
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
}

export interface CategoryBreakdown {
  category: string
  categoryId: string
  amount: number
  color: string
  percentage: number
}
