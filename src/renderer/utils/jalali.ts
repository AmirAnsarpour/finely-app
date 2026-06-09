// Jalali (Persian) calendar utilities
// G→J uses the Intl API (reliable in Electron/Chromium).
// J→G finds Nowruz via Intl then adds a day offset.

const nowruzCache = new Map<number, string>()

// ── Core conversions ──────────────────────────────────────────

export function isoToJalali(iso: string): [number, number, number] {
  const date = new Date(iso + 'T00:00:00')
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(date)
  return [
    parseInt(parts.find(p => p.type === 'year')!.value),
    parseInt(parts.find(p => p.type === 'month')!.value),
    parseInt(parts.find(p => p.type === 'day')!.value)
  ]
}

function nowruzISO(jy: number): string {
  if (nowruzCache.has(jy)) return nowruzCache.get(jy)!
  const approxGy = jy + 621
  for (const gy of [approxGy, approxGy + 1]) {
    for (const day of [19, 20, 21, 22]) {
      const iso = `${gy}-03-${String(day).padStart(2, '0')}`
      const [ty, tm, td] = isoToJalali(iso)
      if (ty === jy && tm === 1 && td === 1) {
        nowruzCache.set(jy, iso)
        return iso
      }
    }
  }
  const fallback = `${approxGy}-03-21`
  nowruzCache.set(jy, fallback)
  return fallback
}

export function jalaliToISO(jy: number, jm: number, jd: number): string {
  // Days from Nowruz (1 Farvardin) to the target date
  const offset = (jm <= 6 ? (jm - 1) * 31 : 186 + (jm - 7) * 30) + (jd - 1)
  const niso = nowruzISO(jy)
  const [ngy, ngm, ngd] = niso.split('-').map(Number)
  const d = new Date(ngy, ngm - 1, ngd)
  d.setDate(d.getDate() + offset)
  const ry = d.getFullYear()
  const rm = d.getMonth() + 1
  const rd = d.getDate()
  return `${ry}-${String(rm).padStart(2, '0')}-${String(rd).padStart(2, '0')}`
}

// ── Month info ────────────────────────────────────────────────

export function isLeapJalali(jy: number): boolean {
  const thisNowruz = new Date(nowruzISO(jy) + 'T00:00:00')
  const nextNowruz = new Date(nowruzISO(jy + 1) + 'T00:00:00')
  const diff = (nextNowruz.getTime() - thisNowruz.getTime()) / 86400000
  return diff === 366
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isLeapJalali(jy) ? 30 : 29
}

// Returns JS getDay() (0=Sun…6=Sat) of the first day of a Jalali month
export function jalaliMonthStartDow(jy: number, jm: number): number {
  return new Date(jalaliToISO(jy, jm, 1) + 'T00:00:00').getDay()
}

// ── Display constants ─────────────────────────────────────────

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
]

// Indexed by JS getDay() (0=Sun, 1=Mon, … 6=Sat)
export const JALALI_WDAY_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش']

// ── Date formatters (input = Gregorian ISO) ───────────────────

export function formatJalaliDate(iso: string): string {
  const [jy, jm, jd] = isoToJalali(iso)
  return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`
}

export function formatJalaliShort(iso: string): string {
  const [, jm, jd] = isoToJalali(iso)
  return `${jd} ${JALALI_MONTHS[jm - 1]}`
}

export function formatJalaliMonthYear(iso: string): string {
  if (iso.length === 7) {
    // Jalali month key like "1405-03" — parse directly, don't convert
    const [jy, jm] = iso.split('-').map(Number)
    return `${JALALI_MONTHS[jm - 1]} ${jy}`
  }
  const [jy, jm] = isoToJalali(iso)
  return `${JALALI_MONTHS[jm - 1]} ${jy}`
}

// ── Month-key helpers (Jalali month keys = "JYYY-MM") ─────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/** Gregorian ISO → Jalali month key, e.g. "2024-06-01" → "1403-03" */
export function getMonthKeyJalali(isoDate: string): string {
  const [jy, jm] = isoToJalali(isoDate)
  return `${jy}-${String(jm).padStart(2, '0')}`
}

/** Today's month as a Jalali month key */
export function currentMonthKeyJalali(): string {
  return getMonthKeyJalali(todayISO())
}

/** Previous month key in Jalali space */
export function previousMonthKeyJalali(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** Last N Jalali months ending with the current month */
function lastNMonthsJalali(n: number): string[] {
  const [jy, jm] = isoToJalali(todayISO())
  const months: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    let m = jm - i, y = jy
    while (m <= 0) { m += 12; y-- }
    months.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return months
}

export function getLast6MonthsJalali(): string[] { return lastNMonthsJalali(6) }
export function getLast12MonthsJalali(): string[] { return lastNMonthsJalali(12) }

/** Days in a Jalali month key, e.g. "1403-03" → 31 */
export function getDaysInMonthJalali(monthKey: string): number {
  const [jy, jm] = monthKey.split('-').map(Number)
  return jalaliMonthLength(jy, jm)
}

/** Gregorian ISO for day D of a Jalali month key, e.g. ("1403-03", 11) → "2024-06-01" */
export function dayISOJalali(monthKey: string, day: number): string {
  const [jy, jm] = monthKey.split('-').map(Number)
  return jalaliToISO(jy, jm, day)
}

/** Display label from a Jalali month key, e.g. "1403-03" → "خرداد ۰۳" */
export function getMonthLabelJalali(monthKey: string): string {
  const [jy, jm] = monthKey.split('-').map(Number)
  return `${JALALI_MONTHS[jm - 1]} ${String(jy).slice(-2)}`
}
