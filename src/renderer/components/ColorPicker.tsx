import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

// 18 curated presets arranged as a spectrum (6 cols × 3 rows)
export const DEFAULT_COLOR_PRESETS = [
  '#6c8ef5', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6',
  '#fb7185', '#f87171', '#fb923c', '#fbbf24', '#facc15', '#4ade80',
  '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#94a3b8', '#e2e8f0',
]

interface Props {
  value: string
  onChange: (color: string) => void
  presets?: string[]
}

function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s)
}

export default function ColorPicker({ value, onChange, presets = DEFAULT_COLOR_PRESETS }: Props) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  useEffect(() => { setHexInput(value) }, [value])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const panelW = 240
    const panelH = 210
    const spaceBelow = window.innerHeight - r.bottom - 8
    const openUp = spaceBelow < panelH && r.top > panelH
    const leftPos = Math.min(r.left, window.innerWidth - panelW - 8)
    setPanelStyle(
      openUp
        ? { position: 'fixed', bottom: window.innerHeight - r.top + 6, left: leftPos, zIndex: 9999 }
        : { position: 'fixed', top: r.bottom + 6, left: leftPos, zIndex: 9999 }
    )
  }, [open])

  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('scroll', onScroll, { capture: true })
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [open])

  function handleHexChange(raw: string) {
    const v = raw.startsWith('#') ? raw : '#' + raw
    setHexInput(v)
    if (isValidHex(v)) onChange(v)
  }

  function handleHexBlur() {
    if (!isValidHex(hexInput)) setHexInput(value)
  }

  const previewColor = isValidHex(hexInput) ? hexInput : value

  return (
    <div className="cp-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`cp-trigger ${open ? 'cp-trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className="cp-dot" style={{ background: value }} />
        <span className="cp-val">{value.toUpperCase()}</span>
        <ChevronDown size={13} className={`cp-chevron ${open ? 'cp-chevron--open' : ''}`} />
      </button>

      {open && createPortal(
        <div ref={panelRef} className="cp-panel" style={panelStyle}>
          <div className="cp-grid">
            {presets.map(c => {
              const active = c.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={c}
                  type="button"
                  className={`cp-swatch ${active ? 'cp-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => { onChange(c); setOpen(false) }}
                  title={c}
                />
              )
            })}
          </div>

          <div className="cp-sep" />

          <div className="cp-custom-row">
            <span className="cp-custom-dot" style={{ background: previewColor }} />
            <input
              className="cp-hex-input"
              value={hexInput}
              onChange={e => handleHexChange(e.target.value)}
              onBlur={handleHexBlur}
              maxLength={7}
              spellCheck={false}
              placeholder="#000000"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .cp-wrap { position: relative; }

        /* ── Trigger ──────────────────────────────────── */
        .cp-trigger {
          width: 100%; display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-radius: var(--radius-sm);
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          color: var(--text-primary); font-size: 14px; font-family: inherit;
          cursor: pointer; text-align: left;
          transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
        }
        .cp-trigger:hover { background: var(--glass-bg-hover); border-color: var(--glass-border-hover); }
        .cp-trigger--open {
          border-color: var(--glass-border-accent);
          background: var(--glass-bg-hover);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .cp-dot {
          width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.15);
        }
        .cp-val {
          flex: 1; font-size: 13px; color: var(--text-primary);
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          letter-spacing: 0.3px;
        }
        .cp-chevron { color: var(--text-muted); flex-shrink: 0; transition: transform 0.24s var(--ease-spring); }
        .cp-chevron--open { transform: rotate(180deg); }

        /* ── Panel ────────────────────────────────────── */
        .cp-panel {
          width: 240px;
          background: rgba(10,10,14,0.97);
          backdrop-filter: blur(48px) saturate(200%);
          -webkit-backdrop-filter: blur(48px) saturate(200%);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 24px 72px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.04);
          animation: cpIn 0.2s var(--ease-spring) both;
        }
        [data-theme='light'] .cp-panel {
          background: rgba(248,250,255,0.97);
          border-color: rgba(0,0,0,0.08);
          box-shadow: 0 24px 72px rgba(0,0,50,0.15), 0 0 0 1px rgba(0,0,0,0.04);
        }
        @keyframes cpIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }

        /* ── Swatch grid ──────────────────────────────── */
        .cp-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 7px;
        }
        .cp-swatch {
          aspect-ratio: 1; border-radius: 8px; border: none; cursor: pointer;
          position: relative; flex-shrink: 0;
          transition: transform 0.15s var(--ease-spring), box-shadow 0.15s ease;
        }
        .cp-swatch:hover:not(.cp-swatch--active) {
          transform: scale(1.18);
          box-shadow: 0 3px 10px rgba(0,0,0,0.5);
          z-index: 1;
        }
        .cp-swatch--active {
          transform: scale(1.18);
          box-shadow: 0 0 0 2px white, 0 0 0 3.5px rgba(0,0,0,0.25), 0 3px 10px rgba(0,0,0,0.5);
          z-index: 1;
        }
        .cp-swatch--active::after {
          content: '✓';
          position: absolute; inset: 0;
          display: grid; place-items: center;
          font-size: 10px; font-weight: 900; color: white;
          text-shadow: 0 0 5px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8);
        }

        /* ── Separator ────────────────────────────────── */
        .cp-sep {
          height: 1px;
          background: rgba(255,255,255,0.07);
          margin: 12px 0;
        }
        [data-theme='light'] .cp-sep { background: rgba(0,0,0,0.07); }

        /* ── Custom hex row ───────────────────────────── */
        .cp-custom-row { display: flex; align-items: center; gap: 9px; }
        .cp-custom-dot {
          width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0;
          box-shadow: 0 1px 5px rgba(0,0,0,0.45);
          border: 1px solid rgba(255,255,255,0.14);
          transition: background 0.15s ease;
        }
        [data-theme='light'] .cp-custom-dot { border-color: rgba(0,0,0,0.12); }
        .cp-hex-input {
          flex: 1; padding: 6px 10px; border-radius: 8px;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          color: var(--text-primary); outline: none; user-select: text;
          transition: border-color var(--transition), box-shadow var(--transition);
        }
        .cp-hex-input:focus {
          border-color: var(--glass-border-accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
          background: var(--glass-bg-hover);
        }
      `}</style>
    </div>
  )
}
