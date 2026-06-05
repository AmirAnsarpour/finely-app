import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import CategoryIcon, { AVAILABLE_ICONS } from '../components/CategoryIcon'
import Modal from '../components/Modal'
import ColorPicker, { DEFAULT_COLOR_PRESETS } from '../components/ColorPicker'
import { normalizeDigits } from '../utils/numerals'
import type { Category } from '../types'
import type { UseDataReturn } from '../hooks/useData'
import { useToast } from '../components/Toast'

interface Props { data: UseDataReturn }

function CategoryForm({
  type,
  initial,
  onSave,
  onCancel
}: {
  type: 'income' | 'expense'
  initial?: Category
  onSave: (c: Omit<Category, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR_PRESETS[0])
  const [icon, setIcon] = useState(initial?.icon ?? AVAILABLE_ICONS[0])
  const [budget, setBudget] = useState(initial?.budget?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    const budgetNum = budget ? parseFloat(budget) : undefined
    if (budget && (isNaN(budgetNum!) || budgetNum! <= 0)) { setError('Budget must be a positive number'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), type, color, icon, budget: budgetNum })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cat-form">
      <div className="form-group">
        <label className="form-label">Name</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Category name…" autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="form-group">
        <label className="form-label">Icon</label>
        <div className="icon-grid">
          {AVAILABLE_ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              className={`icon-btn ${icon === ic ? 'icon-btn--active' : ''}`}
              onClick={() => setIcon(ic)}
              title={ic}
            >
              <CategoryIcon icon={ic} color={icon === ic ? color : 'var(--text-muted)'} size={16} />
            </button>
          ))}
        </div>
      </div>
      {/* Monthly budget (expense only) */}
      {type === 'expense' && (
        <div className="form-group">
          <label className="form-label">Monthly Budget <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <input
            className="form-input"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 500"
            value={budget}
            onChange={e => setBudget(normalizeDigits(e.target.value))}
          />
        </div>
      )}

      {/* Preview */}
      <div className="cat-preview">
        <CategoryIcon icon={icon} color={color} size={18} showBg bgSize={40} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{name || 'Preview'}</span>
        {type === 'expense' && budget && parseFloat(budget) > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            Budget: {budget}
          </span>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Category'}
        </button>
      </div>

    </form>
  )
}

function CategoryList({
  title,
  type,
  categories,
  onAdd,
  onEdit,
  onDelete
}: {
  title: string
  type: 'income' | 'expense'
  categories: Category[]
  onAdd: () => void
  onEdit: (c: Category) => void
  onDelete: (id: string) => void
}) {
  const color = type === 'income' ? 'var(--income)' : 'var(--expense)'
  const bg = type === 'income' ? 'var(--income-dim)' : 'var(--expense-dim)'

  return (
    <GlassCard className="card-appear">
      <div className="cat-list-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={15} color={color} />
          </div>
          <div>
            <h2 className="section-title">{title}</h2>
            <p className="section-sub">{categories.length} categories</p>
          </div>
        </div>
        <button className="btn-sm" onClick={onAdd} style={{ borderColor: `${color}55`, color }}>
          <Plus size={13} /> Add
        </button>
      </div>
      <div className="cat-items">
        {categories.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
            No categories yet
          </p>
        ) : (
          categories.map(c => (
            <div key={c.id} className="cat-item">
              <CategoryIcon icon={c.icon} color={c.color} size={16} showBg bgSize={36} />
              <span className="cat-item__name">{c.name}</span>
              {c.budget && c.budget > 0 && (
                <span className="cat-item__budget">Budget: {c.budget.toLocaleString('en-US')}</span>
              )}
              <div className="cat-item__actions">
                <button className="icon-action" onClick={() => onEdit(c)} title="Edit">
                  <Pencil size={13} />
                </button>
                <button className="icon-action icon-action--danger" onClick={() => onDelete(c.id)} title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </GlassCard>
  )
}

export default function Categories({ data }: Props) {
  const { categories, addCategory, updateCategory, deleteCategory } = data
  const { toast } = useToast()

  const [modalType, setModalType] = useState<'income' | 'expense'>('expense')
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const income = categories.filter(c => c.type === 'income')
  const expense = categories.filter(c => c.type === 'expense')

  const handleAdd = (t: 'income' | 'expense') => { setModalType(t); setEditCat(null); setShowModal(true) }
  const handleEdit = (c: Category) => { setModalType(c.type); setEditCat(c); setShowModal(true) }
  const handleDelete = (id: string) => setConfirmDelete(id)

  const handleSave = async (cat: Omit<Category, 'id'>) => {
    if (editCat) {
      await updateCategory(editCat.id, cat)
      toast('Category updated')
    } else {
      await addCategory(cat)
      toast('Category added')
    }
    setShowModal(false)
    setEditCat(null)
  }

  const confirmDeleteCat = async () => {
    if (confirmDelete) {
      await deleteCategory(confirmDelete)
      setConfirmDelete(null)
      toast('Category deleted', 'info')
    }
  }

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub">Manage your income and expense categories</p>
        </div>
      </div>

      <div className="cat-grid">
        <CategoryList
          title="Income Categories"
          type="income"
          categories={income}
          onAdd={() => handleAdd('income')}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <CategoryList
          title="Expense Categories"
          type="expense"
          categories={expense}
          onAdd={() => handleAdd('expense')}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditCat(null) }}
        title={editCat ? 'Edit Category' : `Add ${modalType === 'income' ? 'Income' : 'Expense'} Category`}
        width={440}
      >
        <CategoryForm
          type={modalType}
          initial={editCat ?? undefined}
          onSave={handleSave}
          onCancel={() => { setShowModal(false); setEditCat(null) }}
        />
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Category" width={380}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Are you sure you want to delete this category? Transactions using it will not be deleted.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={confirmDeleteCat}>Delete</button>
        </div>
      </Modal>

    </div>
  )
}
