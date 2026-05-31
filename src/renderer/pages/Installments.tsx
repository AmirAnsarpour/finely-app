import React, { useState } from 'react'
import {
  Plus, Minus, Pencil, Trash2, CreditCard, Check, ClipboardList,
  User, Calendar, CheckCircle2, Circle, AlertTriangle
} from 'lucide-react'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import DatePicker from '../components/DatePicker'
import ColorPicker, { DEFAULT_COLOR_PRESETS } from '../components/ColorPicker'
import type { Installment, InstallmentPayment } from '../types'
import type { UseDataReturn } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { generateId, todayString } from '../utils/formatters'
import { useCalendar } from '../utils/calendarContext'

// ── Helpers ──────────────────────────────────────────────────

function addMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const targetMonth = month - 1 + months
  const targetYear = year + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()
  const clampedDay = Math.min(day, lastDay)
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
}

function generatePayments(startDate: string, monthlyAmount: number, total: number): InstallmentPayment[] {
  return Array.from({ length: total }, (_, i) => ({
    id: generateId(),
    installmentNumber: i + 1,
    dueDate: addMonths(startDate, i),
    amount: monthlyAmount,
    isPaid: false
  }))
}

function daysUntil(dateStr: string): number {
  const today = new Date(todayString() + 'T00:00:00')
  const due = new Date(dateStr + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getNextUnpaid(installment: Installment): InstallmentPayment | null {
  return installment.payments.find(p => !p.isPaid) ?? null
}

// ── InstallmentForm ───────────────────────────────────────────

interface FormData {
  name: string
  monthlyAmount: string
  totalInstallments: number
  startDate: string
  notes: string
  color: string
}

const MONTH_PRESETS = [3, 6, 12, 18, 24, 36]

function InstallmentForm({
  initial,
  onSave,
  onCancel
}: {
  initial?: Installment
  onSave: (data: FormData) => Promise<void>
  onCancel: () => void
}) {
  const { formatDate } = useCalendar()
  const [name, setName] = useState(initial?.name ?? '')
  const [monthlyAmount, setMonthlyAmount] = useState(initial?.monthlyAmount.toString() ?? '')
  const [totalInstallments, setTotalInstallments] = useState(initial?.totalInstallments ?? 12)
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayString())
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR_PRESETS[0])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = !!initial

  function stepInstallments(delta: number) {
    setTotalInstallments(v => Math.min(360, Math.max(1, v + delta)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    if (!isEdit) {
      const monthly = parseFloat(monthlyAmount)
      if (isNaN(monthly) || monthly <= 0) { setError('Monthly amount must be a positive number'); return }
      if (totalInstallments < 1) { setError('Number of payments must be at least 1'); return }
      if (!startDate) { setError('First payment date is required'); return }
    }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), monthlyAmount, totalInstallments, startDate, notes: notes.trim(), color })
    } finally {
      setSaving(false)
    }
  }

  const monthly = parseFloat(monthlyAmount)
  const derivedTotal = !isNaN(monthly) && monthly > 0 && totalInstallments > 0
    ? monthly * totalInstallments
    : 0

  return (
    <form onSubmit={handleSubmit} className="inst-form">
      <div className="form-group">
        <label className="form-label">Name</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Car Loan, Phone Installment, Debt to Ahmed…" autoFocus />
      </div>

      {isEdit ? (
        <div className="form-readonly-row">
          <div className="form-readonly">
            <span className="form-readonly__label">Monthly Payment</span>
            <span className="form-readonly__value">{initial!.monthlyAmount.toLocaleString()}</span>
          </div>
          <div className="form-readonly">
            <span className="form-readonly__label">Payments</span>
            <span className="form-readonly__value">{initial!.totalInstallments}</span>
          </div>
          <div className="form-readonly">
            <span className="form-readonly__label">First Due</span>
            <span className="form-readonly__value">{formatDate(initial!.startDate)}</span>
          </div>
        </div>
      ) : (
        <>
          {/* Monthly amount — no spin arrows */}
          <div className="form-group">
            <label className="form-label">Monthly Payment</label>
            <input className="form-input no-spinner" type="number" min="0.01" step="0.01"
              value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)}
              placeholder="e.g. 500" inputMode="decimal" />
            {derivedTotal > 0 && (
              <span className="form-hint">Total: {derivedTotal.toLocaleString()}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Number of Payments</label>
            <div className="month-stepper">
              <button type="button" className="stepper-btn" onClick={() => stepInstallments(-1)} disabled={totalInstallments <= 1}>
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <div className="stepper-display">
                <span className="stepper-num">{totalInstallments}</span>
                <span className="stepper-unit">months</span>
              </div>
              <button type="button" className="stepper-btn" onClick={() => stepInstallments(1)} disabled={totalInstallments >= 360}>
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
            <div className="month-presets">
              {MONTH_PRESETS.map(p => (
                <button key={p} type="button"
                  className={`month-preset ${totalInstallments === p ? 'month-preset--active' : ''}`}
                  style={totalInstallments === p ? { borderColor: `${color}88`, color } : undefined}
                  onClick={() => setTotalInstallments(p)}>
                  {p}mo
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">First Payment Date</label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
        </>
      )}

      {/* Notes — compact, max 3 lines */}
      <div className="form-group">
        <label className="form-label">Notes <span className="form-optional">(optional)</span></label>
        <textarea className="form-input form-textarea" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Any additional info…" rows={2} style={{ maxHeight: '72px', minHeight: '48px' }} />
      </div>

      {/* Color */}
      <div className="form-group">
        <label className="form-label">Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Installment'}
        </button>
      </div>

      <style>{`
        .inst-form { display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .form-optional { font-weight: 400; color: var(--text-muted); font-size: 10px; text-transform: none; letter-spacing: 0; }
        .form-hint { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
        .form-input { user-select: text; }
        .form-textarea { resize: none; font-family: inherit; }
        /* Hide number spin buttons */
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner { -moz-appearance: textfield; }
        /* Month presets */
        .month-presets { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
        .month-preset {
          padding: 3px 9px; border-radius: 16px; font-size: 11px; font-weight: 600;
          border: 1px solid var(--glass-border); background: var(--glass-bg);
          color: var(--text-muted); cursor: pointer;
          transition: all var(--transition);
        }
        .month-preset:hover { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .month-preset--active { background: var(--accent-dim); color: var(--accent); border-color: var(--glass-border-accent); }
        /* Custom stepper */
        .month-stepper {
          display: flex; align-items: center;
          border: 1px solid var(--glass-border); border-radius: var(--radius-md);
          background: var(--glass-bg); overflow: hidden; height: 40px;
        }
        .stepper-btn {
          width: 38px; height: 100%; display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; color: var(--text-secondary);
          cursor: pointer; transition: background var(--transition), color var(--transition);
          flex-shrink: 0;
        }
        .stepper-btn:hover:not(:disabled) { background: var(--glass-bg-hover); color: var(--text-primary); }
        .stepper-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .stepper-display {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border);
          padding: 2px 0;
        }
        .stepper-num { font-size: 16px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
        .stepper-unit { font-size: 10px; color: var(--text-muted); line-height: 1; }
        /* Read-only row (edit mode) */
        .form-readonly-row { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md); }
        .form-readonly { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 70px; }
        .form-readonly__label { font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
        .form-readonly__value { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        /* Misc */
        .form-error { font-size: 12px; color: var(--expense); background: var(--expense-dim); padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid rgba(248,113,113,0.25); }
        .form-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 2px; }
        .btn-primary { padding: 10px 20px; border-radius: var(--radius-md); background: var(--accent); color: white; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: background var(--transition), opacity var(--transition); }
        .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-ghost { padding: 10px 20px; border-radius: var(--radius-md); background: var(--glass-bg); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid var(--glass-border); transition: background var(--transition), color var(--transition); }
        .btn-ghost:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
      `}</style>
    </form>
  )
}

// ── PaymentsModal ─────────────────────────────────────────────

function PaymentsModal({
  installment,
  currencySymbol,
  onMarkPaid,
  onMarkUnpaid
}: {
  installment: Installment
  currencySymbol: string
  onMarkPaid: (paymentId: string) => void
  onMarkUnpaid: (paymentId: string) => void
}) {
  const { formatDate } = useCalendar()
  const paidCount = installment.payments.filter(p => p.isPaid).length
  const total = installment.payments.length
  const progress = total > 0 ? paidCount / total : 0

  return (
    <div className="pm-wrap">
      <div className="pm-summary">
        <div className="pm-progress-bar">
          <div className="pm-progress-fill" style={{ width: `${progress * 100}%`, background: installment.color }} />
        </div>
        <span className="pm-progress-label">{paidCount} of {total} payments completed</span>
      </div>

      <div className="pm-list">
        {installment.payments.map(payment => {
          const days = daysUntil(payment.dueDate)
          const isOverdue = !payment.isPaid && days < 0
          const isSoon = !payment.isPaid && days >= 0 && days <= 7

          return (
            <div key={payment.id}
              className={`pm-item ${payment.isPaid ? 'pm-item--paid' : isOverdue ? 'pm-item--overdue' : isSoon ? 'pm-item--soon' : ''}`}>
              <div className="pm-item__num">#{payment.installmentNumber}</div>
              <div className="pm-item__info">
                <span className="pm-item__date">{formatDate(payment.dueDate)}</span>
                {payment.isPaid && payment.paidDate && (
                  <span className="pm-item__sub">Paid {formatDate(payment.paidDate)}</span>
                )}
                {isOverdue && (
                  <span className="pm-item__sub pm-item__sub--overdue">
                    {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} overdue
                  </span>
                )}
                {isSoon && (
                  <span className="pm-item__sub pm-item__sub--soon">
                    Due in {days} day{days !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="pm-item__amount">{currencySymbol}{payment.amount.toLocaleString()}</span>
              <button
                className={`pm-check ${payment.isPaid ? 'pm-check--paid' : ''}`}
                onClick={() => payment.isPaid ? onMarkUnpaid(payment.id) : onMarkPaid(payment.id)}
                title={payment.isPaid ? 'Mark as unpaid' : 'Mark as paid'}
                style={payment.isPaid ? { color: installment.color } : undefined}
              >
                {payment.isPaid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </button>
            </div>
          )
        })}
      </div>

      <style>{`
        .pm-wrap { display: flex; flex-direction: column; gap: 14px; }
        .pm-summary { display: flex; flex-direction: column; gap: 6px; }
        .pm-progress-bar { height: 6px; background: var(--glass-bg-hover); border-radius: 3px; overflow: hidden; }
        .pm-progress-fill { height: 100%; border-radius: 3px; transition: width 0.4s var(--ease-spring); }
        .pm-progress-label { font-size: 12px; color: var(--text-muted); }
        .pm-list { display: flex; flex-direction: column; gap: 4px; max-height: 360px; overflow-y: auto; }
        .pm-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--glass-bg); border: 1px solid var(--glass-border); transition: background var(--transition), border-color var(--transition); }
        .pm-item--paid { opacity: 0.6; }
        .pm-item--overdue { background: var(--expense-dim); border-color: rgba(248,113,113,0.25); }
        .pm-item--soon { background: rgba(251,191,36,0.06); border-color: rgba(251,191,36,0.25); }
        .pm-item__num { font-size: 11px; font-weight: 600; color: var(--text-muted); min-width: 24px; }
        .pm-item__info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .pm-item__date { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .pm-item__sub { font-size: 11px; color: var(--text-muted); }
        .pm-item__sub--overdue { color: var(--expense); }
        .pm-item__sub--soon { color: var(--warning); }
        .pm-item__amount { font-size: 13px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
        .pm-check { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; padding: 2px; border-radius: 50%; transition: color var(--transition), transform var(--transition-spring); }
        .pm-check:hover { transform: scale(1.15); color: var(--text-primary); }
        .pm-check--paid { }
      `}</style>
    </div>
  )
}

// ── InstallmentCard ───────────────────────────────────────────

function InstallmentCard({
  installment,
  currencySymbol,
  onEdit,
  onDelete,
  onMarkNextPaid,
  onViewPayments
}: {
  installment: Installment
  currencySymbol: string
  onEdit: () => void
  onDelete: () => void
  onMarkNextPaid: () => void
  onViewPayments: () => void
}) {
  const { formatDate } = useCalendar()
  const paidCount = installment.payments.filter(p => p.isPaid).length
  const total = installment.payments.length
  const progress = total > 0 ? paidCount / total : 0
  const isComplete = paidCount === total
  const nextPayment = getNextUnpaid(installment)
  const nextDays = nextPayment ? daysUntil(nextPayment.dueDate) : null
  const isOverdue = nextDays !== null && nextDays < 0
  const isSoon = nextDays !== null && nextDays >= 0 && nextDays <= 7

  return (
    <GlassCard className="inst-card card-appear">
      <div className="inst-card__accent" style={{ background: installment.color }} />
      <div className="inst-card__body">
        <div className="inst-card__top">
          <div className="inst-card__meta">
            <h3 className="inst-card__name">{installment.name}</h3>
            {installment.creditor && (
              <div className="inst-card__creditor">
                <User size={11} />
                <span>{installment.creditor}</span>
              </div>
            )}
          </div>
          <div className="inst-card__monthly">
            <span className="inst-card__amount">{currencySymbol}{installment.monthlyAmount.toLocaleString()}</span>
            <span className="inst-card__per-mo">/mo</span>
          </div>
        </div>

        <div className="inst-card__progress">
          <div className="inst-card__bar">
            <div className="inst-card__bar-fill" style={{ width: `${progress * 100}%`, background: installment.color }} />
          </div>
          <div className="inst-card__progress-row">
            <span className="inst-card__progress-text">
              {paidCount} of {total} payments{isComplete ? ' — Complete!' : ' completed'}
            </span>
            {!isComplete && (
              <span className="inst-card__remaining">{total - paidCount} remaining</span>
            )}
          </div>
        </div>

        {!isComplete && nextPayment && (
          <div className={`inst-card__next ${isOverdue ? 'inst-card__next--overdue' : isSoon ? 'inst-card__next--soon' : ''}`}>
            {isOverdue ? <AlertTriangle size={12} /> : <Calendar size={12} />}
            <span>
              Payment {nextPayment.installmentNumber}: {formatDate(nextPayment.dueDate)}
              {isSoon && nextDays! > 0 && ` · in ${nextDays} day${nextDays !== 1 ? 's' : ''}`}
              {nextDays === 0 && ' · due today'}
              {isOverdue && ` · ${Math.abs(nextDays!)} day${Math.abs(nextDays!) !== 1 ? 's' : ''} overdue`}
            </span>
          </div>
        )}

        {isComplete && (
          <div className="inst-card__done">
            <CheckCircle2 size={13} style={{ color: installment.color }} />
            <span>All payments completed</span>
          </div>
        )}

        {installment.notes && (
          <p className="inst-card__notes">{installment.notes}</p>
        )}

        <div className="inst-card__actions">
          {!isComplete && (
            <button className="btn-mark-paid" onClick={onMarkNextPaid}
              style={{ borderColor: `${installment.color}55`, color: installment.color }}>
              <Check size={13} />
              Mark as Paid
            </button>
          )}
          <div className="inst-card__icon-actions">
            <button className="icon-action" onClick={onViewPayments} title="View all payments">
              <ClipboardList size={14} />
            </button>
            <button className="icon-action" onClick={onEdit} title="Edit">
              <Pencil size={14} />
            </button>
            <button className="icon-action icon-action--danger" onClick={onDelete} title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .inst-card { display: flex; overflow: hidden; padding: 0; }
        .inst-card__accent { width: 4px; flex-shrink: 0; }
        .inst-card__body { flex: 1; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
        .inst-card__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .inst-card__meta { flex: 1; min-width: 0; }
        .inst-card__name { font-size: 16px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .inst-card__creditor { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); margin-top: 3px; }
        .inst-card__monthly { text-align: right; flex-shrink: 0; }
        .inst-card__amount { font-size: 18px; font-weight: 700; color: var(--text-primary); }
        .inst-card__per-mo { font-size: 12px; color: var(--text-muted); margin-left: 1px; }
        .inst-card__progress { display: flex; flex-direction: column; gap: 5px; }
        .inst-card__bar { height: 5px; background: var(--glass-bg-hover); border-radius: 3px; overflow: hidden; }
        .inst-card__bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s var(--ease-spring); }
        .inst-card__progress-row { display: flex; justify-content: space-between; }
        .inst-card__progress-text { font-size: 12px; color: var(--text-secondary); }
        .inst-card__remaining { font-size: 12px; color: var(--text-muted); }
        .inst-card__next { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); padding: 6px 10px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); }
        .inst-card__next--soon { color: var(--warning); background: rgba(251,191,36,0.06); border-color: rgba(251,191,36,0.25); }
        .inst-card__next--overdue { color: var(--expense); background: var(--expense-dim); border-color: rgba(248,113,113,0.25); }
        .inst-card__done { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
        .inst-card__notes { font-size: 12px; color: var(--text-muted); line-height: 1.5; padding: 6px 10px; background: var(--glass-bg); border-radius: var(--radius-sm); border: 1px solid var(--glass-border); }
        .inst-card__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 2px; }
        .inst-card__icon-actions { display: flex; gap: 5px; margin-left: auto; }
        .btn-mark-paid { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--radius-sm); background: transparent; border: 1px solid; font-size: 12px; font-weight: 600; cursor: pointer; transition: all var(--transition); }
        .btn-mark-paid:hover { opacity: 0.8; }
        .icon-action { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-xs); background: transparent; border: 1px solid var(--glass-border); color: var(--text-muted); cursor: pointer; transition: all var(--transition); }
        .icon-action:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .icon-action--danger:hover { background: var(--expense-dim); color: var(--expense); border-color: rgba(248,113,113,0.3); }
      `}</style>
    </GlassCard>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function Installments({ data }: { data: UseDataReturn }) {
  const { installments, addInstallment, updateInstallment, deleteInstallment, markPaymentPaid, markPaymentUnpaid, settings } = data
  const { toast } = useToast()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editInst, setEditInst] = useState<Installment | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [viewPaymentsFor, setViewPaymentsFor] = useState<Installment | null>(null)

  const active = installments.filter(inst => inst.payments.some(p => !p.isPaid))
  const completed = installments.filter(inst => inst.payments.length > 0 && inst.payments.every(p => p.isPaid))

  // Sort active: overdue first, then by next due date
  const sortedActive = [...active].sort((a, b) => {
    const nextA = getNextUnpaid(a)
    const nextB = getNextUnpaid(b)
    if (!nextA && !nextB) return 0
    if (!nextA) return 1
    if (!nextB) return -1
    return nextA.dueDate.localeCompare(nextB.dueDate)
  })

  async function handleSave(formData: FormData) {
    if (editInst) {
      await updateInstallment(editInst.id, {
        name: formData.name,
        notes: formData.notes || undefined,
        color: formData.color
      })
      toast('Installment updated')
      setEditInst(null)
    } else {
      const monthly = parseFloat(formData.monthlyAmount)
      const payments = generatePayments(formData.startDate, monthly, formData.totalInstallments)
      await addInstallment({
        name: formData.name,
        monthlyAmount: monthly,
        totalInstallments: formData.totalInstallments,
        startDate: formData.startDate,
        notes: formData.notes || undefined,
        color: formData.color,
        payments
      })
      toast('Installment added')
      setShowAddModal(false)
    }
  }

  async function handleMarkNextPaid(installment: Installment) {
    const next = getNextUnpaid(installment)
    if (!next) return
    await markPaymentPaid(installment.id, next.id)
    // Update viewPaymentsFor if it's currently open for this installment
    if (viewPaymentsFor?.id === installment.id) {
      const updated = installments.find(i => i.id === installment.id)
      if (updated) setViewPaymentsFor({ ...updated, payments: updated.payments.map(p => p.id === next.id ? { ...p, isPaid: true, paidDate: todayString() } : p) })
    }
    toast(`Payment ${next.installmentNumber} of ${installment.totalInstallments} marked as paid`)
  }

  async function handleMarkPaid(installmentId: string, paymentId: string) {
    await markPaymentPaid(installmentId, paymentId)
    setViewPaymentsFor(prev => {
      if (!prev || prev.id !== installmentId) return prev
      return { ...prev, payments: prev.payments.map(p => p.id === paymentId ? { ...p, isPaid: true, paidDate: todayString() } : p) }
    })
  }

  async function handleMarkUnpaid(installmentId: string, paymentId: string) {
    await markPaymentUnpaid(installmentId, paymentId)
    setViewPaymentsFor(prev => {
      if (!prev || prev.id !== installmentId) return prev
      return { ...prev, payments: prev.payments.map(p => p.id === paymentId ? { ...p, isPaid: false, paidDate: undefined } : p) }
    })
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    await deleteInstallment(confirmDelete)
    setConfirmDelete(null)
    toast('Installment deleted', 'info')
  }

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Installments</h1>
          <p className="page-sub">Track your loans, payment plans, and debts</p>
        </div>
        <button className="btn-add" onClick={() => setShowAddModal(true)}>
          <Plus size={15} /> Add Installment
        </button>
      </div>

      {installments.length === 0 ? (
        <GlassCard className="empty-state card-appear">
          <CreditCard size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          <p className="empty-title">No installments yet</p>
          <p className="empty-sub">Add a loan, payment plan, or debt to start tracking your payments.</p>
          <button className="btn-add" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Installment
          </button>
        </GlassCard>
      ) : (
        <>
          {sortedActive.length > 0 && (
            <section className="inst-section">
              <h2 className="inst-section__title">Active <span className="inst-section__count">{sortedActive.length}</span></h2>
              <div className="inst-grid">
                {sortedActive.map(inst => (
                  <InstallmentCard
                    key={inst.id}
                    installment={inst}
                    currencySymbol={settings.currencySymbol}
                    onEdit={() => setEditInst(inst)}
                    onDelete={() => setConfirmDelete(inst.id)}
                    onMarkNextPaid={() => handleMarkNextPaid(inst)}
                    onViewPayments={() => setViewPaymentsFor(inst)}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="inst-section">
              <h2 className="inst-section__title">Completed <span className="inst-section__count">{completed.length}</span></h2>
              <div className="inst-grid">
                {completed.map(inst => (
                  <InstallmentCard
                    key={inst.id}
                    installment={inst}
                    currencySymbol={settings.currencySymbol}
                    onEdit={() => setEditInst(inst)}
                    onDelete={() => setConfirmDelete(inst.id)}
                    onMarkNextPaid={() => {}}
                    onViewPayments={() => setViewPaymentsFor(inst)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Add modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Installment" width={480}>
        <InstallmentForm
          onSave={handleSave}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editInst} onClose={() => setEditInst(null)} title="Edit Installment" width={480}>
        {editInst && (
          <InstallmentForm
            initial={editInst}
            onSave={handleSave}
            onCancel={() => setEditInst(null)}
          />
        )}
      </Modal>

      {/* Payments history modal */}
      <Modal
        open={!!viewPaymentsFor}
        onClose={() => setViewPaymentsFor(null)}
        title={viewPaymentsFor ? `${viewPaymentsFor.name} · Payments` : ''}
        width={460}
      >
        {viewPaymentsFor && (
          <PaymentsModal
            installment={viewPaymentsFor}
            currencySymbol={settings.currencySymbol}
            onMarkPaid={id => handleMarkPaid(viewPaymentsFor.id, id)}
            onMarkUnpaid={id => handleMarkUnpaid(viewPaymentsFor.id, id)}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Installment" width={380}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Are you sure you want to delete this installment? All payment history will be lost.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleConfirmDelete}>Delete</button>
        </div>
      </Modal>

      <style>{`
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
        .page-title {
          font-size: 26px; font-weight: 700; letter-spacing: -0.5px;
          background: linear-gradient(135deg, #e8eaff 0%, rgba(255,255,255,0.65) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
        .btn-add { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: var(--radius-md); background: var(--accent-dim); border: 1px solid rgba(108,142,245,0.35); color: var(--accent); font-size: 13px; font-weight: 600; cursor: pointer; transition: all var(--transition); }
        .btn-add:hover { background: rgba(108,142,245,0.2); border-color: rgba(108,142,245,0.55); }
        [data-theme='black'] .btn-add { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); color: var(--text-primary); }
        [data-theme='black'] .btn-add:hover { background: rgba(255,255,255,0.09); }
        .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; text-align: center; }
        .empty-title { font-size: 16px; font-weight: 600; color: var(--text-secondary); }
        .empty-sub { font-size: 13px; color: var(--text-muted); max-width: 320px; line-height: 1.6; }
        .inst-section { margin-bottom: 28px; }
        .inst-section__title { font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .inst-section__count { background: var(--glass-bg-hover); border: 1px solid var(--glass-border); border-radius: 10px; padding: 1px 7px; font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: none; letter-spacing: 0; }
        .inst-grid { display: flex; flex-direction: column; gap: 10px; }
        .btn-ghost { padding: 10px 20px; border-radius: var(--radius-md); background: var(--glass-bg); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid var(--glass-border); transition: background var(--transition), color var(--transition); }
        .btn-ghost:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .btn-danger { padding: 10px 20px; border-radius: var(--radius-md); background: var(--expense-dim); color: var(--expense); font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid rgba(248,113,113,0.3); transition: all var(--transition); }
        .btn-danger:hover { background: rgba(248,113,113,0.2); }
      `}</style>
    </div>
  )
}
