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

      <style>{`
        .cs-wrap { position: relative; }

        .cs-trigger {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 10px 12px; border-radius: var(--radius-sm);
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          color: var(--text-primary); font-size: 14px; font-family: inherit;
          cursor: pointer; text-align: left;
          transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
        }
        .cs-trigger:hover { background: var(--glass-bg-hover); border-color: var(--glass-border-hover); }
        .cs-trigger:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--accent-glow); border-color: var(--accent); }
        .cs-trigger--open {
          border-color: var(--glass-border-accent);
          background: var(--glass-bg-hover);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .cs-content { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; overflow: hidden; }
        .cs-val { font-size: 14px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cs-ph { font-size: 14px; color: var(--text-muted); }
        .cs-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .cs-arrow { color: var(--text-muted); flex-shrink: 0; transition: transform 0.24s var(--ease-spring); }
        .cs-arrow--open { transform: rotate(180deg); }

        .cs-panel {
          background: rgba(10,10,14,0.97);
          backdrop-filter: blur(48px) saturate(200%); -webkit-backdrop-filter: blur(48px) saturate(200%);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 14px;
          padding: 5px; max-height: 260px; overflow-y: auto;
          box-shadow: 0 20px 64px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.03);
          animation: csIn 0.18s var(--ease-spring) both;
        }
        [data-theme='light'] .cs-panel {
          background: rgba(248,250,255,0.97);
          border-color: rgba(0,0,0,0.08);
          box-shadow: 0 20px 64px rgba(0,0,50,0.14);
        }
        @keyframes csIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cs-panel::-webkit-scrollbar { width: 4px; }
        .cs-panel::-webkit-scrollbar-track { background: transparent; }
        .cs-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
        [data-theme='light'] .cs-panel::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); }

        .cs-opt {
          width: 100%; display: flex; align-items: center; gap: 9px;
          padding: 9px 11px; border-radius: 10px;
          background: transparent; border: none; font-family: inherit;
          color: var(--text-secondary); font-size: 13px;
          cursor: pointer; text-align: left;
          transition: background 0.14s ease, color 0.14s ease;
        }
        [data-theme='light'] .cs-opt { color: rgba(10,15,40,0.65); }
        .cs-opt:hover { background: rgba(255,255,255,0.07); color: var(--text-primary); }
        [data-theme='light'] .cs-opt:hover { background: rgba(108,142,245,0.08); color: rgba(10,15,40,0.9); }
        .cs-opt--on { background: rgba(108,142,245,0.16); color: var(--accent); font-weight: 500; }
        .cs-opt--on:hover { background: rgba(108,142,245,0.22); }
      `}</style>
    </div>
  )
}
