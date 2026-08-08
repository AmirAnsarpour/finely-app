import type { Transaction } from '../types'

// Transfers move money between two of the user's own accounts, so they must
// subtract from the source and add to the destination — never count as
// income/expense, and never appear in only one account's ledger.
export function accountBalance(transactions: Transaction[], accountId: string): number {
  return transactions.reduce((s, t) => {
    if (t.accountId === accountId) {
      if (t.type === 'income') return s + t.amount
      if (t.type === 'expense') return s - t.amount
      if (t.type === 'transfer') return s - t.amount
    }
    if (t.type === 'transfer' && t.toAccountId === accountId) return s + t.amount
    return s
  }, 0)
}
