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

    </div>
  )
}
