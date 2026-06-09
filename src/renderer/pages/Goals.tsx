import React, { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Target, CheckCircle2, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import DatePicker from '../components/DatePicker'
import ColorPicker, { DEFAULT_COLOR_PRESETS } from '../components/ColorPicker'
import CategoryIcon, { AVAILABLE_ICONS } from '../components/CategoryIcon'
import type { Goal } from '../types'
import type { UseDataReturn } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { useCalendar } from '../utils/calendarContext'
import { normalizeDigits } from '../utils/numerals'
import { generateId, todayString } from '../utils/formatters'

// ── Helpers ───────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date(todayString() + 'T00:00:00')
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

// ── Circular progress ring ────────────────────────────────────

function ProgressRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct / 100, 1)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  )
}

// ── GoalForm ──────────────────────────────────────────────────

interface GoalFormData {
  name: string
  targetAmount: string
  currentAmount: string
  deadline: string
  color: string
  icon: string
  notes: string
}

function GoalForm({
  initial,
  onSave,
  onCancel,
  currencySymbol,
}: {
  initial?: Goal
  onSave: (d: GoalFormData) => Promise<void>
  onCancel: () => void
  currencySymbol: string
}) {
  const [name, setName]               = useState(initial?.name ?? '')
  const [targetAmount, setTarget]     = useState(initial?.targetAmount.toString() ?? '')
  const [currentAmount, setCurrent]   = useState(initial?.currentAmount.toString() ?? '')
  const [deadline, setDeadline]       = useState(initial?.deadline ?? '')
  const [color, setColor]             = useState(initial?.color ?? DEFAULT_COLOR_PRESETS[0])
  const [icon, setIcon]               = useState(initial?.icon ?? AVAILABLE_ICONS[0])
  const [notes, setNotes]             = useState(initial?.notes ?? '')
  const [error, setError]             = useState('')
  const [saving, setSaving]           = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    const target = parseFloat(targetAmount)
    if (isNaN(target) || target <= 0) { setError('Target amount must be a positive number'); return }
    const current = parseFloat(currentAmount) || 0
    if (current < 0) { setError('Current amount cannot be negative'); return }
    if (current > target) { setError('Current amount cannot exceed the target'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), targetAmount, currentAmount: currentAmount || '0', deadline, color, icon, notes: notes.trim() })
    } finally {
      setSaving(false)
    }
  }

  const target = parseFloat(targetAmount) || 0
  const current = parseFloat(currentAmount) || 0
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <form onSubmit={handleSubmit} className="goal-form">
      <div className="gf-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Goal Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Emergency Fund, New Laptop…" autoFocus />
        </div>
      </div>

      <div className="gf-amounts">
        <div className="form-group">
          <label className="form-label">Target Amount</label>
          <div className="gf-amount-wrap">
            <span className="gf-sym">{currencySymbol}</span>
            <input className="form-input gf-amount-input" type="text" inputMode="decimal"
              value={targetAmount} onChange={e => setTarget(normalizeDigits(e.target.value))}
              placeholder="0" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Saved So Far <span className="form-optional">(optional)</span></label>
          <div className="gf-amount-wrap">
            <span className="gf-sym">{currencySymbol}</span>
            <input className="form-input gf-amount-input" type="text" inputMode="decimal"
              value={currentAmount} onChange={e => setCurrent(normalizeDigits(e.target.value))}
              placeholder="0" />
          </div>
        </div>
      </div>

      {target > 0 && (
        <div className="gf-preview-bar">
          <div className="gf-bar-track">
            <div className="gf-bar-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          <span className="gf-bar-label">{pct.toFixed(0)}% saved</span>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Deadline <span className="form-optional">(optional)</span></label>
        <DatePicker value={deadline} onChange={setDeadline} clearable placeholder="No deadline" />
      </div>

      <div className="form-group">
        <label className="form-label">Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="form-group">
        <label className="form-label">Icon</label>
        <div className="icon-grid">
          {AVAILABLE_ICONS.map(ic => (
            <button key={ic} type="button"
              className={`icon-btn ${icon === ic ? 'icon-btn--active' : ''}`}
              onClick={() => setIcon(ic)} title={ic}>
              <CategoryIcon icon={ic} color={icon === ic ? color : 'var(--text-muted)'} size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes <span className="form-optional">(optional)</span></label>
        <textarea className="form-input form-textarea" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="What this goal is for…" rows={2} style={{ resize: 'none', maxHeight: 72, minHeight: 48 }} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Goal'}
        </button>
      </div>
    </form>
  )
}

// ── ContributeModal ───────────────────────────────────────────

function ContributeModal({
  goal,
  onSave,
  onCancel,
  currencySymbol,
}: {
  goal: Goal
  onSave: (amount: number) => Promise<void>
  onCancel: () => void
  currencySymbol: string
}) {
  const [amount, setAmount] = useState('')
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const remaining = goal.targetAmount - goal.currentAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseFloat(amount)
    if (isNaN(n) || n <= 0) { setError('Enter a positive amount'); return }
    if (n > remaining) { setError(`Max remaining is ${currencySymbol}${remaining.toLocaleString('en-US')}`); return }
    setSaving(true)
    try { await onSave(n) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
        <CategoryIcon icon={goal.icon} color={goal.color} size={16} showBg bgSize={36} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{goal.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currencySymbol}{goal.currentAmount.toLocaleString('en-US')} / {currencySymbol}{goal.targetAmount.toLocaleString('en-US')}</p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Amount to Add
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 12, fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}>{currencySymbol}</span>
          <input
            className="form-input"
            type="text"
            inputMode="decimal"
            style={{ paddingLeft: 28 }}
            value={amount}
            onChange={e => setAmount(normalizeDigits(e.target.value))}
            placeholder={`Up to ${currencySymbol}${remaining.toLocaleString('en-US')}`}
            autoFocus
          />
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--expense)' }}>{error}</p>}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn-ghost" onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--glass-border)' }}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)', background: goal.color, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Add Funds'}
        </button>
      </div>
    </form>
  )
}

// ── GoalCard ──────────────────────────────────────────────────

function GoalCard({
  goal,
  currencySymbol,
  onEdit,
  onDelete,
  onContribute,
}: {
  goal: Goal
  currencySymbol: string
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
}) {
  const { formatDate } = useCalendar()
  const pct       = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0
  const isComplete = goal.currentAmount >= goal.targetAmount
  const remaining  = goal.targetAmount - goal.currentAmount
  const days       = goal.deadline ? daysUntil(goal.deadline) : null
  const isOverdue  = days !== null && days < 0 && !isComplete
  const isSoon     = days !== null && days >= 0 && days <= 30 && !isComplete

  return (
    <GlassCard className="goal-card card-appear">
      <div className="gc-accent" style={{ background: goal.color }} />
      <div className="gc-body">
        <div className="gc-top">
          <CategoryIcon icon={goal.icon} color={goal.color} size={15} showBg bgSize={34} />
          <div className="gc-meta">
            <h3 className="gc-name">{goal.name}</h3>
            {goal.notes && <p className="gc-notes">{goal.notes}</p>}
          </div>
          <div className="gc-pct-ring">
            <ProgressRing pct={pct} color={isComplete ? '#4ade80' : goal.color} size={46} />
            <span className="gc-pct-label" style={{ color: isComplete ? '#4ade80' : goal.color }}>
              {isComplete ? <CheckCircle2 size={14} /> : `${Math.round(pct)}%`}
            </span>
          </div>
        </div>

        <div className="gc-amounts">
          <div className="gc-amt-main">
            <span className="gc-saved">{currencySymbol}{goal.currentAmount.toLocaleString('en-US')}</span>
            <span className="gc-sep"> / </span>
            <span className="gc-target">{currencySymbol}{goal.targetAmount.toLocaleString('en-US')}</span>
          </div>
          {!isComplete && (
            <span className="gc-remaining">{currencySymbol}{remaining.toLocaleString('en-US')} to go</span>
          )}
        </div>

        <div className="gc-bar-track">
          <div className="gc-bar-fill" style={{
            width: `${pct}%`,
            background: isComplete ? '#4ade80' : goal.color
          }} />
        </div>

        {goal.deadline && (
          <div className={`gc-deadline ${isOverdue ? 'gc-deadline--overdue' : isSoon ? 'gc-deadline--soon' : ''}`}>
            <Calendar size={11} />
            <span>
              {isComplete ? `Completed — ${formatDate(goal.deadline)}` :
               isOverdue  ? `${Math.abs(days!)} day${Math.abs(days!) !== 1 ? 's' : ''} overdue` :
               days === 0 ? 'Due today' :
               `${days} day${days !== 1 ? 's' : ''} left — ${formatDate(goal.deadline)}`}
            </span>
          </div>
        )}

        <div className="gc-actions">
          {!isComplete && (
            <button className="gc-contribute" onClick={onContribute} style={{ borderColor: `${goal.color}55`, color: goal.color }}>
              <Plus size={12} />
              Add Funds
            </button>
          )}
          {isComplete && (
            <div className="gc-done">
              <CheckCircle2 size={13} style={{ color: '#4ade80' }} />
              <span>Goal reached!</span>
            </div>
          )}
          <div className="gc-icon-actions">
            <button className="icon-action" onClick={onEdit} title="Edit"><Pencil size={13} /></button>
            <button className="icon-action icon-action--danger" onClick={onDelete} title="Delete"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function Goals({ data }: { data: UseDataReturn }) {
  const { goals, addGoal, updateGoal, deleteGoal, logGoalContribution, settings } = data
  const { toast } = useToast()
  const { formatDate } = useCalendar()

  const [showAdd, setShowAdd]               = useState(false)
  const [editGoal, setEditGoal]             = useState<Goal | null>(null)
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null)
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null)

  const active    = goals.filter(g => g.currentAmount < g.targetAmount)
  const completed = goals.filter(g => g.currentAmount >= g.targetAmount)

  const summary = useMemo(() => {
    const totalTarget  = goals.reduce((s, g) => s + g.targetAmount, 0)
    const totalSaved   = goals.reduce((s, g) => s + g.currentAmount, 0)
    const overallPct   = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0
    return { totalTarget, totalSaved, overallPct }
  }, [goals])

  async function handleSave(d: GoalFormData) {
    const target = parseFloat(d.targetAmount)
    const current = parseFloat(d.currentAmount) || 0
    if (editGoal) {
      await updateGoal(editGoal.id, {
        name: d.name, color: d.color, icon: d.icon,
        notes: d.notes || undefined, deadline: d.deadline || undefined,
      })
      toast('Goal updated')
      setEditGoal(null)
    } else {
      await addGoal({
        name: d.name, targetAmount: target, currentAmount: current,
        color: d.color, icon: d.icon,
        notes: d.notes || undefined, deadline: d.deadline || undefined,
      })
      toast('Goal created')
      setShowAdd(false)
    }
  }

  async function handleContribute(amount: number) {
    if (!contributeGoal) return
    await logGoalContribution(contributeGoal.id, amount)
    const remaining = contributeGoal.targetAmount - contributeGoal.currentAmount
    if (amount >= remaining) {
      toast(`🎉 Goal reached: ${contributeGoal.name}`, 'info')
    } else {
      toast(`Added ${settings.currencySymbol}${amount.toLocaleString('en-US')} to ${contributeGoal.name}`)
    }
    setContributeGoal(null)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    await deleteGoal(confirmDelete)
    setConfirmDelete(null)
    toast('Goal deleted', 'info')
  }

  const sym = settings.currencySymbol

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="page-sub">Track your savings goals and milestones</p>
        </div>
        <button className="btn-add" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <GlassCard className="card-appear goals-empty">
          <div className="goals-empty-ring">
            <Target size={26} color="var(--accent)" />
          </div>
          <p className="goals-empty-title">No goals yet</p>
          <p className="goals-empty-sub">Create a savings goal — for an emergency fund, a big purchase, or anything worth working toward.</p>
          <button className="btn-add" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Create your first goal
          </button>
        </GlassCard>
      ) : (
        <>
          {/* Summary bar */}
          <GlassCard className="goals-summary card-appear">
            <div className="gs-item">
              <span className="gs-label">Total Target</span>
              <span className="gs-value">{sym}{summary.totalTarget.toLocaleString('en-US')}</span>
            </div>
            <div className="gs-divider" />
            <div className="gs-item">
              <span className="gs-label">Total Saved</span>
              <span className="gs-value" style={{ color: 'var(--income)' }}>{sym}{summary.totalSaved.toLocaleString('en-US')}</span>
            </div>
            <div className="gs-divider" />
            <div className="gs-item">
              <span className="gs-label">Overall Progress</span>
              <span className="gs-value" style={{ color: 'var(--accent)' }}>{summary.overallPct.toFixed(1)}%</span>
            </div>
            <div className="gs-divider" />
            <div className="gs-item">
              <span className="gs-label">Active / Done</span>
              <span className="gs-value">{active.length} / {completed.length}</span>
            </div>
          </GlassCard>

          {active.length > 0 && (
            <section className="goals-section">
              <h2 className="goals-section__title">
                Active <span className="goals-section__count">{active.length}</span>
              </h2>
              <div className="goals-grid">
                {active.map(g => (
                  <GoalCard key={g.id} goal={g} currencySymbol={sym}
                    onEdit={() => setEditGoal(g)}
                    onDelete={() => setConfirmDelete(g.id)}
                    onContribute={() => setContributeGoal(g)}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="goals-section">
              <h2 className="goals-section__title">
                Completed <span className="goals-section__count">{completed.length}</span>
              </h2>
              <div className="goals-grid">
                {completed.map(g => (
                  <GoalCard key={g.id} goal={g} currencySymbol={sym}
                    onEdit={() => setEditGoal(g)}
                    onDelete={() => setConfirmDelete(g.id)}
                    onContribute={() => setContributeGoal(g)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modals */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Goal" width={480}>
        <GoalForm onSave={handleSave} onCancel={() => setShowAdd(false)} currencySymbol={sym} />
      </Modal>

      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Edit Goal" width={480}>
        {editGoal && (
          <GoalForm initial={editGoal} onSave={handleSave} onCancel={() => setEditGoal(null)} currencySymbol={sym} />
        )}
      </Modal>

      <Modal open={!!contributeGoal} onClose={() => setContributeGoal(null)}
        title={`Add Funds — ${contributeGoal?.name ?? ''}`} width={400}>
        {contributeGoal && (
          <ContributeModal goal={contributeGoal} currencySymbol={sym}
            onSave={handleContribute} onCancel={() => setContributeGoal(null)} />
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Goal" width={380}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Are you sure you want to delete this goal? Your saved progress will be lost.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
