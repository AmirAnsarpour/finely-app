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

    </div>
  )
}
