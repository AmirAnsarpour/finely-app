import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Trash2 } from 'lucide-react'
import type { Transaction, Category, AppSettings } from '../types'
import CategoryIcon from './CategoryIcon'
import { formatCurrency } from '../utils/formatters'
import { useCalendar } from '../utils/calendarContext'

interface TransactionItemProps {
  transaction: Transaction
  categories: Category[]
  settings: AppSettings
  onEdit?: (t: Transaction) => void
  onDelete?: (id: string) => void
  animDelay?: number
}

export default function TransactionItem({
  transaction,
  categories,
  settings,
  onEdit,
  onDelete,
  animDelay = 0
}: TransactionItemProps) {
  const { formatDateShort } = useCalendar()
  const category = categories.find(c => c.id === transaction.category)
  const isIncome = transaction.type === 'income'
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)

  return (
    <div
      className="tx-row tx-row-enter"
      style={{ animationDelay: `${animDelay}ms` }}
      onMouseEnter={transaction.note ? e => setTip({ x: e.clientX, y: e.clientY }) : undefined}
      onMouseMove={transaction.note ? e => setTip({ x: e.clientX, y: e.clientY }) : undefined}
      onMouseLeave={transaction.note ? () => setTip(null) : undefined}
    >
      <CategoryIcon
        icon={category?.icon ?? 'tag'}
        color={category?.color ?? '#94a3b8'}
        size={18}
        showBg
        bgSize={42}
      />

      <div className="tx-row__info">
        <span className="tx-row__name">{category?.name ?? 'Unknown'}</span>
        {transaction.note && (
          <span className="tx-row__note">
            {transaction.note}
          </span>
        )}
        {transaction.tags && transaction.tags.length > 0 && (
          <div className="tx-row__tags">
            {transaction.tags.map(tag => (
              <span key={tag} className="tx-row__tag"><span style={{ opacity: 0.5, fontSize: 9 }}>#</span>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {tip && transaction.note && createPortal(
        <div className="tx-tip" style={{ left: tip.x, top: tip.y - 10, transform: 'translate(-50%, -100%)' }}>
          {transaction.note}
        </div>,
        document.body
      )}

      <div className="tx-row__right">
        <span className={`tx-row__amount ${isIncome ? 'income' : 'expense'}`}>
          {isIncome ? '+' : '-'}
          {formatCurrency(transaction.amount, settings.currencySymbol, settings.currencyLocale)}
        </span>
        <span className="tx-row__date">{formatDateShort(transaction.date)}</span>
      </div>

      {(onEdit || onDelete) && (
        <div className="tx-row__actions">
          {onEdit && (
            <button className="tx-row__btn" onClick={() => onEdit(transaction)} title="Edit">
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button className="tx-row__btn tx-row__btn--danger" onClick={() => onDelete(transaction.id)} title="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

    </div>
  )
}
