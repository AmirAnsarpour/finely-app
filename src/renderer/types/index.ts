export interface Account {
  id: string
  name: string
  color: string
  icon: string
  createdAt: string
}

export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: string          // empty string for transfers
  date: string
  note: string
  tags?: string[]
  accountId?: string        // transfers: source account
  toAccountId?: string      // transfers: destination account
  createdAt: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
  icon: string
  budget?: number
  rollover?: boolean
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
  investmentCurrency: 'IRT' | 'USDT'
  aiProvider?: AIProvider
  aiModel?: string
  aiBaseUrl?: string         // only used when aiProvider === 'custom'
  aiAutoMonthly?: boolean
  aiResponseLanguage?: AIResponseLanguage
  showMenuBarBalance?: boolean   // macOS only — shows total balance next to the tray icon
}

export interface VaultStatus {
  exists: boolean            // whether this data folder has encryption set up
  unlocked: boolean          // whether the passphrase has already been entered this session
  osUnlockAvailable: boolean // whether this device's OS-level secure storage can be used at all
  osUnlockEnabled: boolean   // whether the user opted into skipping the passphrase via the OS
}

export interface OsUnlockResult {
  ok: boolean
  reason?: string // underlying error (e.g. a Touch ID/LocalAuthentication message), for diagnosing failures
}

// 'auto' asks the model to match the language of the data it's given
// (category names, etc.) — the other values force a specific language
// regardless of what the data looks like.
export type AIResponseLanguage = 'auto' | 'fa' | 'en'

// AI spending analysis — bring-your-own API key, any provider. The key
// itself never lives in settings.json; it's stored separately (OS-encrypted)
// so the plain-JSON data folder never holds a credential.
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom'

export interface AIUsage {
  inputTokens?: number
  outputTokens?: number
}

export interface AICallResult {
  text: string
  usage?: AIUsage
}

export interface AIChatStreamParams {
  provider: AIProvider
  model: string
  baseUrl?: string
  systemPrompt: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export interface SpendingAnalysis {
  id: string
  createdAt: string   // ISO timestamp this analysis was generated
  monthKey: string    // the month (in the app's current calendar) it covers
  content: string      // the model's response, plain text
  provider: AIProvider
  model: string
}

// One entry per completed AI call, purely informational (token counts only —
// no dollar estimate, since per-model pricing isn't something we can keep
// current across every provider without going stale).
export interface AIUsageEntry {
  id: string
  createdAt: string
  provider: AIProvider
  model: string
  purpose: string
  inputTokens?: number
  outputTokens?: number
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
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

export type InvestmentAssetType = 'crypto' | 'gold' | 'fiat'
export type InvestmentTransactionType = 'buy' | 'sell'

export interface InvestmentTransaction {
  id: string
  type: InvestmentTransactionType
  quantity: number    // always positive — the sign is derived from `type`
  date: string        // ISO date of the transaction
  note?: string
  valueTomanAtTime?: number  // total Toman value of this transaction, captured at the moment it was recorded (absent for older entries recorded before this was tracked)
  createdAt: string
}

export interface Investment {
  id: string
  assetId: string     // references an entry in INVESTMENT_ASSETS
  quantity: number    // current balance, kept in sync with the transaction history
  transactions: InvestmentTransaction[]
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
