// Pixel math + header generators + lane assignment for FT-020 Gantt.
// Pure functions only — no DOM, no Vue. Tested in isolation.

import {
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
