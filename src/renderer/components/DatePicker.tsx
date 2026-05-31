import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'
import { useCalendar } from '../utils/calendarContext'
import {
  isoToJalali, jalaliToISO,
  jalaliMonthLength, jalaliMonthStartDow,
  JALALI_MONTHS, JALALI_WDAY_SHORT
} from '../utils/jalali'

interface Props {
  value: string        // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void
  max?: string         // 'YYYY-MM-DD' — disables future dates
  placeholder?: string
  clearable?: boolean
}

const GREG_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
// Indexed by JS getDay() (0=Sun…6=Sat)
const GREG_WDAY  = ['Su','Mo','Tu','We','Th','Fr','Sa']

function pad(n: number) { return String(n).padStart(2, '0') }
function isoOf(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}` }

// ── grid helpers ──────────────────────────────────────────────

function buildGregGrid(vy: number, vm0: number, startDay: number): (number | null)[] {
  // vm0 is 0-indexed (JS month)
  const firstDow = new Date(vy, vm0, 1).getDay()
  const total    = new Date(vy, vm0 + 1, 0).getDate()
  const offset   = (firstDow - startDay + 7) % 7
  const cells: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function buildJalaliGrid(jy: number, jm: number, startDay: number): (number | null)[] {
  const firstDow = jalaliMonthStartDow(jy, jm)
  const total    = jalaliMonthLength(jy, jm)
  const offset   = (firstDow - startDay + 7) % 7
  const cells: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function wdayHeaders(calType: 'gregorian' | 'jalali', startDay: number): string[] {
  const src = calType === 'jalali' ? JALALI_WDAY_SHORT : GREG_WDAY
  return Array.from({ length: 7 }, (_, i) => src[(startDay + i) % 7])
}

// ── trigger display ───────────────────────────────────────────

function fmtDisplay(iso: string, calType: 'gregorian' | 'jalali'): string {
  if (calType === 'jalali') {
    const [jy, jm, jd] = isoToJalali(iso)
    return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`
  }
  const [y, m, d] = iso.split('-').map(Number)
  return `${GREG_MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`
}

function fmtMonthHeading(vy: number, vm: number, calType: 'gregorian' | 'jalali'): string {
  if (calType === 'jalali') return `${JALALI_MONTHS[vm - 1]} ${vy}`
  return `${GREG_MONTHS[vm - 1]} ${vy}`
}

// ── component ─────────────────────────────────────────────────

export default function DatePicker({ value, onChange, max, placeholder = 'Select date…', clearable = false }: Props) {
  const { calendarType, weekStartDay } = useCalendar()
  const isJalali = calendarType === 'jalali'
  const now = new Date()
  const todayISO = isoOf(now.getFullYear(), now.getMonth() + 1, now.getDate())

  // ── navigation state (vy, vm are 1-indexed for both calendars) ──
  function initView(): [number, number] {
    const src = value || todayISO
    if (isJalali) {
      const [jy, jm] = isoToJalali(src)
      return [jy, jm]
    }
    const [y, m] = src.split('-').map(Number)
    return [y, m]
  }

  const [open,     setOpen]     = useState(false)
  const [[vy, vm], setView]     = useState<[number,number]>(initView)
  const [slideKey, setSlideKey] = useState(0)
  const [slideDir, setSlideDir] = useState<'left'|'right'>('left')
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  // Re-sync view when value or calendarType changes
  useEffect(() => {
    if (!open) setView(initView())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, calendarType])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const panelW = 272, panelH = 316
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
    const close = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node))
        setOpen(false)
    }
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

  function navigate(dir: 'prev' | 'next') {
    setSlideDir(dir === 'next' ? 'left' : 'right')
    setSlideKey(k => k + 1)
    setView(([y, m]) => {
      if (dir === 'prev') return m === 1 ? [y - 1, 12] : [y, m - 1]
      return m === 12 ? [y + 1, 1] : [y, m + 1]
    })
  }

  // ── max-month guard ───────────────────────────────────────────
  function isAfterMax(y: number, m: number): boolean {
    if (!max) return false
    if (isJalali) {
      const [my, mm] = isoToJalali(max)
      return y > my || (y === my && m > mm)
    }
    return y > +max.slice(0, 4) || (y === +max.slice(0, 4) && m > +max.slice(5, 7))
  }
  const canNext = !isAfterMax(vm === 12 ? vy + 1 : vy, vm === 12 ? 1 : vm + 1)

  // ── grid ───────────────────────────────────────────────────────
  const cells = isJalali
    ? buildJalaliGrid(vy, vm, weekStartDay)
    : buildGregGrid(vy, vm - 1, weekStartDay)  // Gregorian: vm is 1-indexed here

  // ── cell → ISO ────────────────────────────────────────────────
  function cellISO(day: number): string {
    return isJalali
      ? jalaliToISO(vy, vm, day)
      : isoOf(vy, vm, day)
  }

  const wdays = wdayHeaders(calendarType, weekStartDay)

  return (
    <div className="dp-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`dp-trigger ${open ? 'dp-trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className="dp-cal-icon-wrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dp-cal-icon">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </span>
        <span className={value ? 'dp-val' : 'dp-ph'}>
          {value ? fmtDisplay(value, calendarType) : placeholder}
        </span>
        {clearable && value
          ? <span className="dp-clear" onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}>
              <X size={12} />
            </span>
          : <ChevronDown size={13} className={`dp-chevron ${open ? 'dp-chevron--open' : ''}`} />
        }
      </button>

      {open && createPortal(
        <div ref={panelRef} className="dp-panel" style={panelStyle}>
          <div className="dp-nav">
            <button type="button" className="dp-navbtn" onClick={() => navigate('prev')}>
              <ChevronLeft size={14} />
            </button>
            <span className="dp-month">{fmtMonthHeading(vy, vm, calendarType)}</span>
            <button type="button" className="dp-navbtn" onClick={() => navigate('next')} disabled={!canNext}>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="dp-weekrow">
            {wdays.map((d, i) => <span key={i} className="dp-wday">{d}</span>)}
          </div>

          <div key={slideKey} className={`dp-daygrid ${slideDir === 'left' ? 'dp-slide-l' : 'dp-slide-r'}`}>
            {cells.map((day, i) => {
              if (day === null) return <span key={`e${i}`} />
              const iso      = cellISO(day)
              const disabled = !!max && iso > max
              const isToday  = iso === todayISO
              const isSel    = iso === value
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  className={`dp-day ${isToday ? 'dp-today' : ''} ${isSel ? 'dp-sel' : ''} ${disabled ? 'dp-disabled' : ''}`}
                  onClick={() => { onChange(iso); setOpen(false) }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .dp-wrap { position: relative; }

        .dp-trigger {
          width: 100%; display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-radius: var(--radius-sm);
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          color: var(--text-primary); font-size: 14px; font-family: inherit;
          cursor: pointer; text-align: left;
          transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
        }
        .dp-trigger:hover { background: var(--glass-bg-hover); border-color: var(--glass-border-hover); }
        .dp-trigger:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--accent-glow); border-color: var(--accent); }
        .dp-trigger--open {
          border-color: var(--glass-border-accent);
          background: var(--glass-bg-hover);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .dp-cal-icon-wrap { display: flex; align-items: center; flex-shrink: 0; }
        .dp-cal-icon { color: var(--text-muted); }
        .dp-val { flex: 1; font-size: 14px; color: var(--text-primary); }
        .dp-ph  { flex: 1; font-size: 14px; color: var(--text-muted); }
        .dp-chevron { color: var(--text-muted); flex-shrink: 0; transition: transform 0.24s var(--ease-spring); }
        .dp-chevron--open { transform: rotate(180deg); }
        .dp-clear {
          display: flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--glass-bg-hover); color: var(--text-muted); flex-shrink: 0;
          transition: background var(--transition), color var(--transition);
        }
        .dp-clear:hover { background: var(--expense-dim); color: var(--expense); }

        /* ── Panel ──────────────────────────────────── */
        .dp-panel {
          width: 272px;
          background: rgba(10,10,14,0.97);
          backdrop-filter: blur(48px) saturate(200%); -webkit-backdrop-filter: blur(48px) saturate(200%);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 18px;
          padding: 14px 12px;
          box-shadow: 0 24px 72px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.04);
          animation: dpIn 0.2s var(--ease-spring) both;
        }
        [data-theme='light'] .dp-panel {
          background: rgba(248,250,255,0.97);
          border-color: rgba(0,0,0,0.08);
          box-shadow: 0 24px 72px rgba(0,0,50,0.15), 0 0 0 1px rgba(0,0,0,0.04);
        }
        @keyframes dpIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Navigation ──────────────────────────────── */
        .dp-nav {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
        }
        .dp-month { font-size: 13px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.2px; }
        .dp-navbtn {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          color: var(--text-secondary); cursor: pointer;
          transition: background var(--transition), color var(--transition), border-color var(--transition);
        }
        .dp-navbtn:hover:not(:disabled) { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .dp-navbtn:disabled { opacity: 0.2; cursor: not-allowed; }

        /* ── Grid ────────────────────────────────────── */
        .dp-weekrow { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 3px; }
        .dp-wday {
          text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
          color: var(--text-muted); padding: 3px 0; text-transform: uppercase;
        }

        .dp-daygrid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
        .dp-slide-l { animation: dpSlL 0.19s var(--ease-out) both; }
        .dp-slide-r { animation: dpSlR 0.19s var(--ease-out) both; }
        @keyframes dpSlL { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes dpSlR { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }

        .dp-day {
          aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
          border-radius: 8px; background: transparent; border: none; font-family: inherit;
          font-size: 12px; font-weight: 400; color: var(--text-secondary);
          cursor: pointer; position: relative;
          transition: background 0.14s ease, color 0.14s ease, transform 0.15s var(--ease-spring);
        }
        .dp-day:hover:not(:disabled):not(.dp-sel) {
          background: rgba(255,255,255,0.08); color: var(--text-primary); transform: scale(1.15);
        }
        [data-theme='light'] .dp-day:hover:not(:disabled):not(.dp-sel) {
          background: rgba(108,142,245,0.1);
        }
        .dp-today:not(.dp-sel) { color: var(--accent); font-weight: 600; }
        .dp-today:not(.dp-sel)::after {
          content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%);
          width: 3px; height: 3px; border-radius: 50%; background: var(--accent);
        }
        .dp-sel {
          background: var(--accent); color: white; font-weight: 700;
          border-radius: 50%;
          box-shadow: 0 2px 14px rgba(108,142,245,0.55);
          transform: scale(1.1);
        }
        .dp-sel:hover { background: var(--accent); transform: scale(1.1); }
        .dp-disabled { opacity: 0.18; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
