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
import { normalizeDigits } from '../utils/numerals'
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
            <span className="form-readonly__value">{initial!.monthlyAmount.toLocaleString('en-US')}</span>
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
            <input className="form-input" type="text" inputMode="decimal"
              value={monthlyAmount} onChange={e => setMonthlyAmount(normalizeDigits(e.target.value))}
              placeholder="e.g. 500" />
            {derivedTotal > 0 && (
              <span className="form-hint">Total: {derivedTotal.toLocaleString('en-US')}</span>
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
              <span className="pm-item__amount">{currencySymbol}{payment.amount.toLocaleString('en-US')}</span>
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
            <span className="inst-card__amount">{currencySymbol}{installment.monthlyAmount.toLocaleString('en-US')}</span>
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
    </div>
  )
}
