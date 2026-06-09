import React, { useState, useMemo } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, History, ChevronRight } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import DatePicker from '../components/DatePicker'
import Select from '../components/Select'
import CategoryIcon from '../components/CategoryIcon'
import type { Investment, InvestmentAssetType, InvestmentTransactionType } from '../types'
import type { UseDataReturn } from '../hooks/useData'
import { useToast } from '../components/Toast'
import { useCalendar } from '../utils/calendarContext'
import { normalizeDigits } from '../utils/numerals'
import { todayString } from '../utils/formatters'
import { INVESTMENT_ASSETS, getAssetDef, type InvestmentAssetDef } from '../utils/investmentAssets'
import { useInvestmentPrices } from '../hooks/useInvestmentPrices'
import { formatPriceValue } from '../utils/investmentPricing'

const ASSET_TYPE_SHORT_LABELS: Record<InvestmentAssetType, string> = {
  crypto: 'Crypto',
  gold: 'Gold',
  fiat: 'Fiat',
}

const ASSET_OPTIONS = INVESTMENT_ASSETS.map(a => ({
  value: a.id,
  label: `${a.symbol} — ${a.name}`,
  color: a.color,
}))

function formatQty(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

// ── TransactionForm ───────────────────────────────────────────

interface TransactionFormData {
  assetId: string
  type: InvestmentTransactionType
  quantity: number
  date: string
  note: string
}

function TransactionForm({
  initialAssetId,
  investments,
  onSave,
  onCancel,
}: {
  initialAssetId?: string
  investments: Investment[]
  onSave: (d: TransactionFormData) => Promise<void>
  onCancel: () => void
}) {
  const [assetId, setAssetId]   = useState(initialAssetId ?? '')
  const [type, setType]         = useState<InvestmentTransactionType>('buy')
  const [quantity, setQuantity] = useState('')
  const [date, setDate]         = useState(todayString())
  const [note, setNote]         = useState('')
  const [error, setError]       = useState('')
  const [saving, setSaving]     = useState(false)

  const asset    = getAssetDef(assetId)
  const holding  = investments.find(i => i.assetId === assetId)
  const balance  = holding?.quantity ?? 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!assetId || !asset) { setError('Select an asset'); return }
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) { setError('Enter a positive amount'); return }
    if (type === 'sell' && qty > balance) { setError(`You only hold ${formatQty(balance)} ${asset.symbol}`); return }
    if (!date) { setError('Select a date'); return }
    setSaving(true)
    try {
      await onSave({ assetId, type, quantity: qty, date, note: note.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tx-form">
      {!initialAssetId && (
        <div className="form-group">
          <label className="form-label">Asset</label>
          <Select value={assetId} onChange={setAssetId} options={ASSET_OPTIONS} placeholder="Select an asset…" />
        </div>
      )}

      <div className="itx-row">
        <div className="form-group itx-row__type">
          <label className="form-label">Type</label>
          <div className="seg-toggle">
            <button type="button"
              className={`seg-btn seg-btn--buy ${type === 'buy' ? 'seg-btn--active' : ''}`}
              onClick={() => setType('buy')}>Buy</button>
            <button type="button"
              className={`seg-btn seg-btn--sell ${type === 'sell' ? 'seg-btn--active' : ''}`}
              onClick={() => setType('sell')}>Sell</button>
          </div>
        </div>
        <div className="form-group itx-row__qty">
          <div className="itx-qty-label">
            <label className="form-label">Quantity {asset && <span className="form-optional">({asset.symbol})</span>}</label>
            {type === 'sell' && asset && balance > 0 && (
              <button type="button" className="itx-sell-all" onClick={() => setQuantity(String(balance))}>
                Sell All
              </button>
            )}
          </div>
          <input className="form-input" type="text" inputMode="decimal"
            value={quantity} onChange={e => setQuantity(normalizeDigits(e.target.value))}
            placeholder="0" autoFocus={!!initialAssetId} />
        </div>
      </div>

      {asset && (
        <p className="itx-balance">
          {type === 'sell' ? 'Available to sell: ' : 'Currently holding: '}
          <strong style={{ color: asset.color }}>{formatQty(balance)} {asset.symbol}</strong>
        </p>
      )}

      <div className="itx-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Date</label>
          <DatePicker value={date} onChange={setDate} max={todayString()} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Note <span className="form-optional">(optional)</span></label>
          <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Via exchange…" />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className={`btn-primary ${type === 'sell' ? 'btn-primary--sell' : ''}`} disabled={saving}>
          {saving ? 'Saving…' : type === 'sell' ? 'Record Sale' : 'Record Purchase'}
        </button>
      </div>
    </form>
  )
}

// ── HistoryModal ──────────────────────────────────────────────

function HistoryModal({
  investment,
  asset,
  onDeleteTransaction,
}: {
  investment: Investment
  asset: InvestmentAssetDef
  onDeleteTransaction: (transactionId: string) => void
}) {
  const { formatDate } = useCalendar()
  const sorted = [...investment.transactions].sort((a, b) =>
    b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="inv-history">
      {sorted.map(t => (
        <div key={t.id} className="inv-history__row">
          <div className="inv-history__icon">
            {t.type === 'sell'
              ? <TrendingDown size={14} color="var(--expense)" />
              : <TrendingUp size={14} color="var(--income)" />}
          </div>
          <div className="inv-history__main">
            <span className="inv-history__qty" style={{ color: t.type === 'sell' ? 'var(--expense)' : 'var(--income)' }}>
              {t.type === 'sell' ? '−' : '+'}{formatQty(t.quantity)} {asset.symbol}
            </span>
            <span className="inv-history__date">{formatDate(t.date)}{t.note ? ` · ${t.note}` : ''}</span>
          </div>
          <button className="icon-action icon-action--danger" title="Delete transaction"
            onClick={() => onDeleteTransaction(t.id)}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── InvestmentCard ────────────────────────────────────────────

function InvestmentCard({
  investment,
  asset,
  unitPriceLabel,
  valueLabel,
  costBasisLabel,
  pnl,
  pnlPct,
  onTransact,
  onViewHistory,
}: {
  investment: Investment
  asset: InvestmentAssetDef
  unitPriceLabel: string | null
  valueLabel: string | null
  costBasisLabel: string | null
  pnl: number | null
  pnlPct: number | null
  onTransact: () => void
  onViewHistory: () => void
}) {
  return (
    <GlassCard className="inv-card card-appear">
      <div className="inv-card__accent" style={{ background: asset.color }} />
      <div className="inv-card__body">
        <div className="inv-card__top">
          <CategoryIcon icon={asset.icon} color={asset.color} size={16} showBg bgSize={38} />
          <div className="inv-card__meta">
            <h3 className="inv-card__name">{asset.name}</h3>
            <p className="inv-card__sym">{asset.symbol} · {ASSET_TYPE_SHORT_LABELS[asset.type]}</p>
          </div>
        </div>

        <div className="inv-card__balance">
          <span className="inv-card__qty">{formatQty(investment.quantity)}</span>
          <span className="inv-card__unit">{asset.symbol}</span>
        </div>

        <div className="inv-card__stats">
          <div className="inv-card__stat">
            <span className="inv-card__stat-label">Price / unit</span>
            <span className="inv-card__stat-value">{unitPriceLabel ?? '—'}</span>
          </div>
          <div className="inv-card__stat">
            <span className="inv-card__stat-label">Total value</span>
            <span className="inv-card__stat-value inv-card__stat-value--total">{valueLabel ?? '—'}</span>
          </div>
          {costBasisLabel != null && (
            <div className="inv-card__stat">
              <span className="inv-card__stat-label">Cost basis</span>
              <span className="inv-card__stat-value">{costBasisLabel}</span>
            </div>
          )}
          {pnl != null && pnlPct != null && (
            <div className="inv-card__stat">
              <span className="inv-card__stat-label">P&amp;L</span>
              <span className="inv-card__stat-value" style={{ color: pnl >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {pnl >= 0 ? '+' : '−'}{formatPriceValue(Math.abs(pnl), 'IRT')}
                <span className="inv-card__pnl-pct"> ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
              </span>
            </div>
          )}
        </div>

        <button className="inv-card__history" onClick={onViewHistory}>
          <History size={12} />
          <span>{investment.transactions.length} transaction{investment.transactions.length !== 1 ? 's' : ''}</span>
          <ChevronRight size={13} />
        </button>

        <button className="inv-card__add" style={{ borderColor: `${asset.color}55`, color: asset.color }} onClick={onTransact}>
          <Plus size={12} />
          Buy / Sell
        </button>
      </div>
    </GlassCard>
  )
}

function computeCostBasis(investment: Investment): number | null {
  let total = 0
  let hasData = false
  for (const tx of investment.transactions) {
    if (tx.valueTomanAtTime == null) continue
    hasData = true
    total += tx.type === 'buy' ? tx.valueTomanAtTime : -tx.valueTomanAtTime
  }
  return hasData ? Math.max(0, total) : null
}

// ── Main page ─────────────────────────────────────────────────

export default function Investments({ data }: { data: UseDataReturn }) {
  const { investments, settings, recordInvestmentTransaction, deleteInvestmentTransaction } = data
  const { toast } = useToast()
  const displayCurrency = settings.investmentCurrency

  const [showAdd, setShowAdd]                 = useState(false)
  const [transactFor, setTransactFor]         = useState<Investment | null>(null)
  const [historyFor, setHistoryFor]           = useState<Investment | null>(null)

  const { prices } = useInvestmentPrices(investments, displayCurrency)

  // Ranks holdings by their live value when available, falling back to the
  // rough USD reference price while prices are loading or unavailable.
  function estimatedValue(inv: Investment, asset: InvestmentAssetDef): number {
    const live = prices[inv.assetId]
    if (live != null) return inv.quantity * live
    return inv.quantity * asset.refPriceUsd
  }

  const sorted = useMemo(() => {
    return investments
      .map(inv => ({ inv, asset: getAssetDef(inv.assetId) }))
      .filter((x): x is { inv: Investment; asset: InvestmentAssetDef } => !!x.asset)
      .sort((a, b) => estimatedValue(b.inv, b.asset) - estimatedValue(a.inv, a.asset))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments, prices])

  const portfolioValue = useMemo(() => {
    let total = 0
    let hasAny = false
    for (const { inv, asset } of sorted) {
      const live = prices[asset.id]
      if (live == null) continue
      total += inv.quantity * live
      hasAny = true
    }
    return hasAny ? total : null
  }, [sorted, prices])

  async function handleSave(d: TransactionFormData) {
    await recordInvestmentTransaction(d.assetId, d.type, d.quantity, d.date, d.note || undefined)
    const asset = getAssetDef(d.assetId)
    if (d.type === 'sell') {
      toast(`Sold ${formatQty(d.quantity)} ${asset?.symbol ?? ''}`, 'info')
    } else {
      toast(`Added ${formatQty(d.quantity)} ${asset?.symbol ?? ''} to your holdings`)
    }
    setShowAdd(false)
    setTransactFor(null)
  }

  async function handleDeleteTransaction(transactionId: string) {
    if (!historyFor) return
    await deleteInvestmentTransaction(historyFor.id, transactionId)
    toast('Transaction removed', 'info')
    setHistoryFor(null)
  }

  const totalHoldings = investments.length
  const totalTransactions = investments.reduce((s, i) => s + i.transactions.length, 0)

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Investment</h1>
          <p className="page-sub">Track your crypto, gold, and fiat currency holdings</p>
        </div>
        <button className="btn-add" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Buy / Sell
        </button>
      </div>

      {investments.length === 0 ? (
        <GlassCard className="card-appear goals-empty">
          <div className="goals-empty-ring">
            <TrendingUp size={26} color="var(--accent)" />
          </div>
          <p className="goals-empty-title">No investments yet</p>
          <p className="goals-empty-sub">Record your first purchase — pick a cryptocurrency, gold, or a fiat currency, and we'll start tracking your holdings and history.</p>
          <button className="btn-add" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Record your first purchase
          </button>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="goals-summary card-appear">
            <div className="gs-item">
              <span className="gs-label">Holdings</span>
              <span className="gs-value">{totalHoldings}</span>
            </div>
            <div className="gs-divider" />
            <div className="gs-item">
              <span className="gs-label">Total Transactions</span>
              <span className="gs-value">{totalTransactions}</span>
            </div>
            <div className="gs-divider" />
            <div className="gs-item">
              <span className="gs-label">Portfolio Value</span>
              <span className="gs-value" style={portfolioValue == null ? { color: 'var(--text-muted)' } : undefined}>
                {portfolioValue == null ? '—' : formatPriceValue(portfolioValue, displayCurrency)}
              </span>
            </div>
          </GlassCard>

          <div className="inv-grid">
            {sorted.map(({ inv, asset }) => {
              const unitPrice = prices[asset.id]
              const currentValueIRT = displayCurrency === 'IRT' && unitPrice != null ? inv.quantity * unitPrice : null
              const costBasis = displayCurrency === 'IRT' ? computeCostBasis(inv) : null
              const pnl = costBasis != null && currentValueIRT != null ? currentValueIRT - costBasis : null
              const pnlPct = costBasis != null && pnl != null && costBasis > 0 ? (pnl / costBasis) * 100 : null
              return (
                <InvestmentCard key={inv.id} investment={inv} asset={asset}
                  unitPriceLabel={unitPrice != null ? formatPriceValue(unitPrice, displayCurrency) : null}
                  valueLabel={unitPrice != null ? formatPriceValue(inv.quantity * unitPrice, displayCurrency) : null}
                  costBasisLabel={costBasis != null ? formatPriceValue(costBasis, 'IRT') : null}
                  pnl={pnl}
                  pnlPct={pnlPct}
                  onTransact={() => setTransactFor(inv)}
                  onViewHistory={() => setHistoryFor(inv)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Modals */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Transaction" width={400}>
        <TransactionForm investments={investments} onSave={handleSave} onCancel={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!transactFor} onClose={() => setTransactFor(null)}
        title={transactFor ? `${getAssetDef(transactFor.assetId)?.symbol ?? ''} Transaction` : 'Transaction'} width={380}>
        {transactFor && (
          <TransactionForm initialAssetId={transactFor.assetId} investments={investments}
            onSave={handleSave} onCancel={() => setTransactFor(null)} />
        )}
      </Modal>

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)}
        title={`History — ${historyFor ? getAssetDef(historyFor.assetId)?.name ?? '' : ''}`} width={420}>
        {historyFor && (() => {
          const asset = getAssetDef(historyFor.assetId)
          return asset ? (
            <HistoryModal investment={historyFor} asset={asset} onDeleteTransaction={handleDeleteTransaction} />
          ) : null
        })()}
      </Modal>
    </div>
  )
}
