export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  note: string
  tags?: string[]
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
  calendarType?: 'gregorian' | 'jalali'
  weekStartDay?: 0 | 1 | 6   // 0=Sun, 1=Mon, 6=Sat
}

export interface InstallmentPayment {
  id: string
  installmentNumber: number
  dueDate: string
  paidDate?: string
  amount: number
  isPaid: boolean
}

export interface Installment {
  id: string
  name: string
  creditor?: string
  monthlyAmount: number
  totalInstallments: number
  startDate: string
  payments: InstallmentPayment[]
  notes?: string
  color: string
  createdAt: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  color: string
  icon: string
  deadline?: string   // ISO date, optional
  notes?: string
  createdAt: string
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
