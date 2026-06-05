import React, { createContext, useContext } from 'react'
import type { AppSettings } from '../types'
import {
  formatJalaliDate, formatJalaliShort,
  formatJalaliMonthYear, getMonthLabelJalali,
  getMonthKeyJalali, currentMonthKeyJalali,
  previousMonthKeyJalali, getLast6MonthsJalali, getLast12MonthsJalali,
  getDaysInMonthJalali, dayISOJalali,
} from './jalali'
import {
  formatDate as fmtDateGeo,
  formatDateShort as fmtShortGeo,
  formatMonthYear as fmtMonthYearGeo,
  getMonthLabel as fmtMonthLabelGeo,
  getMonthKey as getMonthKeyGeo,
  currentMonthKey as currentMonthKeyGeo,
  previousMonthKey as previousMonthKeyGeo,
  getLast6Months as getLast6MonthsGeo,
  getLast12Months as getLast12MonthsGeo,
} from './formatters'

// ── Gregorian helpers for getDaysInMonth / dayISO ────────────

function getDaysInMonthGeo(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function dayISOGeo(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, '0')}`
}

// ── Context type ──────────────────────────────────────────────

export interface CalendarContextValue {
  calendarType: 'gregorian' | 'jalali'
  weekStartDay: 0 | 1 | 6

  // Display formatters (input = Gregorian ISO or month key in current calendar)
  formatDate: (iso: string) => string
  formatDateShort: (iso: string) => string
  formatMonthYear: (iso: string) => string

  // Month-key functions — ALL operate in the active calendar's key space
  // e.g. in Jalali mode, month keys are Jalali "JYYY-MM" strings
  getMonthKey: (isoDate: string) => string
  currentMonthKey: () => string
  previousMonthKey: (monthKey: string) => string
  getLast6Months: () => string[]
  getLast12Months: () => string[]
  getMonthLabel: (monthKey: string) => string

  // Per-day helpers for the daily spending chart
  getDaysInMonth: (monthKey: string) => number
  dayISO: (monthKey: string, day: number) => string
}

// ── Context & defaults ────────────────────────────────────────

const CalendarContext = createContext<CalendarContextValue>({
  calendarType: 'gregorian',
  weekStartDay: 0,
  formatDate: fmtDateGeo,
  formatDateShort: fmtShortGeo,
  formatMonthYear: fmtMonthYearGeo,
  getMonthKey: getMonthKeyGeo,
  currentMonthKey: currentMonthKeyGeo,
  previousMonthKey: previousMonthKeyGeo,
  getLast6Months: getLast6MonthsGeo,
  getLast12Months: getLast12MonthsGeo,
  getMonthLabel: fmtMonthLabelGeo,
  getDaysInMonth: getDaysInMonthGeo,
  dayISO: dayISOGeo,
})

// ── Provider ──────────────────────────────────────────────────

export function CalendarProvider({
  settings,
  children,
}: {
  settings: AppSettings
  children: React.ReactNode
}) {
  const type  = settings.calendarType  ?? 'gregorian'
  const start = settings.weekStartDay  ?? 0
  const isJ   = type === 'jalali'

  const value: CalendarContextValue = {
    calendarType: type,
    weekStartDay: start,

    formatDate:      isJ ? formatJalaliDate      : fmtDateGeo,
    formatDateShort: isJ ? formatJalaliShort     : fmtShortGeo,
    formatMonthYear: isJ ? formatJalaliMonthYear : fmtMonthYearGeo,

    getMonthKey:      isJ ? getMonthKeyJalali      : getMonthKeyGeo,
    currentMonthKey:  isJ ? currentMonthKeyJalali  : currentMonthKeyGeo,
    previousMonthKey: isJ ? previousMonthKeyJalali : previousMonthKeyGeo,
    getLast6Months:   isJ ? getLast6MonthsJalali   : getLast6MonthsGeo,
    getLast12Months:  isJ ? getLast12MonthsJalali  : getLast12MonthsGeo,
    getMonthLabel:    isJ ? getMonthLabelJalali     : fmtMonthLabelGeo,

    getDaysInMonth: isJ ? getDaysInMonthJalali : getDaysInMonthGeo,
    dayISO:         isJ ? dayISOJalali         : dayISOGeo,
  }

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────

export function useCalendar(): CalendarContextValue {
  return useContext(CalendarContext)
}
