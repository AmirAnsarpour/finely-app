import React, { createContext, useContext } from 'react'
import type { AppSettings } from '../types'
import {
  formatJalaliDate, formatJalaliShort,
  formatJalaliMonthYear, formatJalaliMonthLabel
} from './jalali'
import { formatDate as fmtDateGeo, formatDateShort as fmtShortGeo, formatMonthYear as fmtMonthYearGeo, getMonthLabel as fmtMonthLabelGeo } from './formatters'

export interface CalendarContextValue {
  calendarType: 'gregorian' | 'jalali'
  weekStartDay: 0 | 1 | 6   // 0=Sun, 1=Mon, 6=Sat (JS getDay() convention)
  formatDate: (iso: string) => string
  formatDateShort: (iso: string) => string
  formatMonthYear: (iso: string) => string
  getMonthLabel: (monthKey: string) => string
}

const CalendarContext = createContext<CalendarContextValue>({
  calendarType: 'gregorian',
  weekStartDay: 0,
  formatDate: fmtDateGeo,
  formatDateShort: fmtShortGeo,
  formatMonthYear: fmtMonthYearGeo,
  getMonthLabel: fmtMonthLabelGeo,
})

export function CalendarProvider({
  settings,
  children
}: {
  settings: AppSettings
  children: React.ReactNode
}) {
  const type = settings.calendarType ?? 'gregorian'
  const start = settings.weekStartDay ?? 6

  const value: CalendarContextValue = {
    calendarType: type,
    weekStartDay: start,
    formatDate:      type === 'jalali' ? formatJalaliDate      : fmtDateGeo,
    formatDateShort: type === 'jalali' ? formatJalaliShort     : fmtShortGeo,
    formatMonthYear: type === 'jalali' ? formatJalaliMonthYear : fmtMonthYearGeo,
    getMonthLabel:   type === 'jalali' ? formatJalaliMonthLabel : fmtMonthLabelGeo,
  }

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}

export function useCalendar(): CalendarContextValue {
  return useContext(CalendarContext)
}
