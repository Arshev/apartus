// Pixel math + header generators + lane assignment for FT-020 Gantt.
// Pure functions only — no DOM, no Vue. Tested in isolation.

import {
  parseIsoDate,
  startOfDay,
  startOfMonth,
  endOfMonth,
  diffDays,
  addDays,
  formatMonth,
  formatShortDate,
} from './date.js'

const MIN_BAR_PX = 2

/**
 * Distance from `viewStart` to `date` in pixels.
 * @param {Date} date
 * @param {Date} viewStart
 * @param {number} pixelsPerMs
 * @returns {number}
 */
export function dateToPixel(date, viewStart, pixelsPerMs) {
  return (date.valueOf() - viewStart.valueOf()) * pixelsPerMs
}

/**
 * Bar width in pixels with a minimum to keep zero/very-short bookings hoverable.
 * @param {Date} start
 * @param {Date} end
 * @param {number} pixelsPerMs
 * @returns {number}
 */
export function bookingWidth(start, end, pixelsPerMs) {
  return Math.max((end.valueOf() - start.valueOf()) * pixelsPerMs, MIN_BAR_PX)
}

/**
 * Top-level header cells (months for the daily view).
 * Each entry covers the visible portion of one calendar month.
 * @param {Date} viewStart
 * @param {Date} viewEnd
 * @param {string} [locale='ru']
 * @returns {Array<{date: Date, label: string, days: number, isCurrentMonth: boolean}>}
 */
export function generateTopLevelDates(viewStart, viewEnd, locale = 'ru') {
  const result = []
  const today = startOfDay(new Date())
  let cursor = startOfMonth(viewStart)
  const end = startOfDay(viewEnd)

  while (cursor.valueOf() <= end.valueOf()) {
    const monthEnd = endOfMonth(cursor)
    const visibleStart = cursor.valueOf() < startOfDay(viewStart).valueOf()
      ? startOfDay(viewStart)
      : cursor
    const visibleEnd = monthEnd.valueOf() > end.valueOf() ? end : monthEnd
    const days = diffDays(visibleStart, visibleEnd) + 1

    result.push({
      date: new Date(cursor),
      label: formatMonth(cursor, locale),
      days,
      isCurrentMonth: cursor.getFullYear() === today.getFullYear()
        && cursor.getMonth() === today.getMonth(),
    })

    cursor = startOfMonth(addDays(monthEnd, 1))
  }

  return result
}

/**
 * Bottom-level header cells (days for the daily view).
 * One entry per day in [viewStart, viewEnd] inclusive.
 * @param {Date} viewStart
 * @param {Date} viewEnd
 * @param {string} [locale='ru']
 * @returns {Array<{date: Date, label: string, dayOfWeek: string, isToday: boolean, isWeekend: boolean}>}
 */
export function generateBottomLevelDates(viewStart, viewEnd, locale = 'ru') {
  const result = []
  const today = startOfDay(new Date())
  const end = startOfDay(viewEnd)
  let cursor = startOfDay(viewStart)

  while (cursor.valueOf() <= end.valueOf()) {
    const dow = cursor.getDay()
    result.push({
      date: new Date(cursor),
      label: formatShortDate(cursor, locale),
      dayOfWeek: cursor.toLocaleDateString(locale, { weekday: 'short' }),
      isToday: cursor.valueOf() === today.valueOf(),
      isWeekend: dow === 0 || dow === 6,
    })
    cursor = addDays(cursor, 1)
  }

  return result
}

const MS_PER_DAY = 86_400_000

/**
 * Classify a reservation for FT-021 Handover mode.
 *
 * Returns one of:
 *   - 'checkin_today'     — confirmed, check_in === today
 *   - 'checkin_tomorrow'  — confirmed, check_in === today + 1d
 *   - 'checkout_today'    — checked_in, check_out === today
 *   - 'checkout_tomorrow' — checked_in, check_out === today + 1d
 *   - null                — no match (including checked_out, cancelled,
 *                           invalid dates, or outside the ±1d bracket)
 *
 * Caller must pass `today` as a local-midnight Date (use `startOfDay(new Date())`).
 *
 * @param {{status: string, check_in: string, check_out: string}} booking
 * @param {Date} today — local midnight
 * @returns {string|null}
 */
export function getHandoverType(booking, today) {
  if (!booking || !today) return null
  if (!booking.check_in || !booking.check_out) return null
  const todayMs = today.valueOf()
  const tomorrowMs = todayMs + MS_PER_DAY

  if (booking.status === 'confirmed') {
    let checkInMs
    try {
      checkInMs = parseIsoDate(booking.check_in).valueOf()
    } catch {
      return null
    }
    if (checkInMs === todayMs) return 'checkin_today'
    if (checkInMs === tomorrowMs) return 'checkin_tomorrow'
    return null
  }

  if (booking.status === 'checked_in') {
    let checkOutMs
    try {
      checkOutMs = parseIsoDate(booking.check_out).valueOf()
    } catch {
      return null
    }
    if (checkOutMs === todayMs) return 'checkout_today'
    if (checkOutMs === tomorrowMs) return 'checkout_tomorrow'
    return null
  }

  return null
}

/**
 * Count overdue days for a reservation (FT-022 Overdue mode).
 *
 * A reservation is overdue when the guest is still checked_in but the
 * `check_out` date has already passed (`check_out < today`).
 *
 * Returns the number of whole days overdue (≥ 1) when the condition holds,
 * or `0` for all other statuses / future/same-day check_out / invalid dates.
 *
 * Caller passes `today` as local-midnight Date (use `startOfDay(new Date())`).
 *
 * @param {{status: string, check_out: string}} booking
 * @param {Date} today
 * @returns {number}
 */
export function getOverdueDays(booking, today) {
  if (!booking || !today) return 0
  if (booking.status !== 'checked_in') return 0
  if (!booking.check_out) return 0
  try {
    const checkOutMs = parseIsoDate(booking.check_out).valueOf()
    const todayMs = today.valueOf()
    if (checkOutMs >= todayMs) return 0
    return Math.ceil((todayMs - checkOutMs) / MS_PER_DAY)
  } catch {
    return 0
  }
}

/**
 * Greedy lane assignment for overlapping bookings within one row.
 * Sorts by start ascending (longer items first on tie) and packs each item
 * into the earliest lane whose previous item ended at or before this start.
 * Items without `_start`/`_end` are filtered out by the caller — this function
 * assumes all entries have valid Date objects.
 * @param {Array<{id: string|number, _start: Date, _end: Date}>} bookings
 * @returns {{ lanes: Object<string, number>, maxLane: number }}
 */
export function assignLanes(bookings) {
  if (!bookings || bookings.length === 0) return { lanes: {}, maxLane: 0 }

  const sorted = [...bookings].sort((a, b) => {
    const diff = a._start.valueOf() - b._start.valueOf()
    if (diff !== 0) return diff
    return (b._end.valueOf() - b._start.valueOf()) - (a._end.valueOf() - a._start.valueOf())
  })

  const lanes = {}
  const laneEnds = []

  for (const booking of sorted) {
    const start = booking._start.valueOf()
    let placed = false
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= start) {
        lanes[booking.id] = i
        laneEnds[i] = booking._end.valueOf()
        placed = true
        break
      }
    }
    if (!placed) {
      lanes[booking.id] = laneEnds.length
      laneEnds.push(booking._end.valueOf())
    }
  }

  return { lanes, maxLane: laneEnds.length }
}
