import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  color?: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
}

export default function Select({ value, onChange, options, placeholder = 'Select…' }: Props) {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPanelStyle({ position: 'fixed', top: r.bottom + 5, left: r.left, width: r.width, zIndex: 9999 })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    // Only dismiss on scroll when the scroll originated outside the panel
    const dismiss = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', dismiss, { capture: true })
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('scroll', dismiss, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const handleKey = (e: React.KeyboardEvent) => {
    const idx = options.findIndex(o => o.value === value)
    if (e.key === 'Escape') { setOpen(false) }
    else if ((e.key === 'Enter' || e.key === ' ') && !open) { e.preventDefault(); setOpen(true) }
    else if (e.key === 'ArrowDown' && open) { e.preventDefault(); const n = options[Math.min(idx + 1, options.length - 1)]; if (n) onChange(n.value) }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); const n = options[Math.max(idx - 1, 0)]; if (n) onChange(n.value) }
  }

  return (
    <div className="cs-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`cs-trigger ${open ? 'cs-trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        onKeyDown={handleKey}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="cs-content">
          {selected?.color && <span className="cs-dot" style={{ background: selected.color }} />}
          <span className={selected ? 'cs-val' : 'cs-ph'}>{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown size={13} className={`cs-arrow ${open ? 'cs-arrow--open' : ''}`} />
      </button>

      {open && createPortal(
        <div ref={panelRef} className="cs-panel" style={panelStyle}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`cs-opt ${opt.value === value ? 'cs-opt--on' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              {opt.color && <span className="cs-dot" style={{ background: opt.color }} />}
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}

    </div>
  )
}
