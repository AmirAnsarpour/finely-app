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
          <span
            className="tx-row__note"
            onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY })}
            onMouseMove={e => setTip({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setTip(null)}
          >
            {transaction.note}
          </span>
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

      <style>{`
        .tx-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          transition: background var(--transition), border-color var(--transition), transform var(--transition-spring);
          cursor: default;
        }
        .tx-row:hover {
          background: var(--glass-bg-hover);
          border-color: var(--glass-border-hover);
          transform: translateX(2px);
        }
        .tx-row:hover .tx-row__actions {
          opacity: 1;
          pointer-events: all;
        }
        .tx-row__info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .tx-row__name {
          font-weight: 500;
          font-size: 14px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tx-row__note {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tx-row__right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .tx-row__amount {
          font-weight: 600;
          font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .tx-row__amount.income { color: var(--income); }
        .tx-row__amount.expense { color: var(--expense); }
        .tx-row__date {
          font-size: 11px;
          color: var(--text-muted);
        }
        .tx-row__actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--transition);
        }
        .tx-row__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-xs);
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          transition: background var(--transition), color var(--transition), border-color var(--transition);
        }
        .tx-row__btn:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
          border-color: var(--glass-border-hover);
        }
        .tx-row__btn--danger:hover {
          background: var(--expense-dim);
          color: var(--expense);
          border-color: rgba(248, 113, 113, 0.3);
        }
        .tx-tip {
          position: fixed; z-index: 9999; pointer-events: none;
          max-width: 280px; padding: 8px 12px;
          background: rgba(10,10,14,0.97);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          font-size: 12px; color: var(--text-primary); line-height: 1.5;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          backdrop-filter: blur(20px);
          animation: fadeIn 0.12s ease both;
          white-space: pre-wrap; word-break: break-word;
        }
        [data-theme='light'] .tx-tip {
          background: rgba(248,250,255,0.97);
          border-color: rgba(0,0,0,0.08);
          box-shadow: 0 8px 32px rgba(0,0,50,0.12);
        }
      `}</style>
    </div>
  )
}
