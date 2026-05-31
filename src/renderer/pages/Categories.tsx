import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import CategoryIcon, { AVAILABLE_ICONS } from '../components/CategoryIcon'
import Modal from '../components/Modal'
import ColorPicker, { DEFAULT_COLOR_PRESETS } from '../components/ColorPicker'
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
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 500"
            value={budget}
            onChange={e => setBudget(e.target.value)}
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

      <style>{`
        .cat-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .form-input { user-select: text; }
.icon-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .icon-btn { width: 34px; height: 34px; border-radius: var(--radius-xs); background: var(--glass-bg); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all var(--transition); }
        .icon-btn:hover { background: var(--glass-bg-hover); border-color: var(--glass-border-hover); }
        .icon-btn--active { background: var(--accent-dim); border-color: var(--glass-border-accent); }
        .cat-preview { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md); }
        .form-error { font-size: 12px; color: var(--expense); background: var(--expense-dim); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid rgba(248,113,113,0.25); }
        .form-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
        .btn-primary { padding: 10px 20px; border-radius: var(--radius-md); background: var(--accent); color: white; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: background var(--transition), opacity var(--transition); }
        .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-ghost { padding: 10px 20px; border-radius: var(--radius-md); background: var(--glass-bg); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid var(--glass-border); transition: background var(--transition), color var(--transition); }
        .btn-ghost:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
      `}</style>
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
                <span className="cat-item__budget">Budget: {c.budget.toLocaleString()}</span>
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

      <style>{`
        .cat-list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-title { font-size: 15px; font-weight: 600; }
        .section-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .btn-sm { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: var(--radius-sm); background: transparent; border: 1px solid var(--glass-border); font-size: 13px; font-weight: 500; cursor: pointer; transition: background var(--transition), color var(--transition); }
        .btn-sm:hover { background: var(--glass-bg); }
        .cat-items { display: flex; flex-direction: column; gap: 6px; }
        .cat-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--glass-bg); border: 1px solid var(--glass-border); transition: background var(--transition), border-color var(--transition); }
        .cat-item:hover { background: var(--glass-bg-hover); border-color: var(--glass-border-hover); }
        .cat-item:hover .cat-item__actions { opacity: 1; pointer-events: all; }
        .cat-item__name { flex: 1; font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .cat-item__budget { font-size: 11px; color: var(--text-muted); background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2px 8px; white-space: nowrap; }
        .cat-item__actions { display: flex; gap: 4px; opacity: 0; pointer-events: none; transition: opacity var(--transition); }
        .icon-action { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: var(--radius-xs); background: transparent; border: 1px solid var(--glass-border); color: var(--text-muted); cursor: pointer; transition: all var(--transition); }
        .icon-action:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .icon-action--danger:hover { background: var(--expense-dim); color: var(--expense); border-color: rgba(248,113,113,0.3); }
      `}</style>
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

      <style>{`
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .page-title {
          font-size: 26px; font-weight: 700; letter-spacing: -0.5px;
          background: linear-gradient(135deg, #e8eaff 0%, rgba(255,255,255,0.65) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
        .cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 800px) { .cat-grid { grid-template-columns: 1fr; } }
        .btn-ghost { padding: 10px 20px; border-radius: var(--radius-md); background: var(--glass-bg); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid var(--glass-border); transition: background var(--transition), color var(--transition); }
        .btn-ghost:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .btn-danger { padding: 10px 20px; border-radius: var(--radius-md); background: var(--expense-dim); color: var(--expense); font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid rgba(248,113,113,0.3); transition: all var(--transition); }
        .btn-danger:hover { background: rgba(248,113,113,0.2); }
      `}</style>
    </div>
  )
}
