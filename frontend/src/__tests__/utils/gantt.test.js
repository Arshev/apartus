import { describe, it, expect } from 'vitest'
import {
  dateToPixel,
  bookingWidth,
  generateTopLevelDates,
  generateBottomLevelDates,
  assignLanes,
} from '../../utils/gantt.js'
import { parseIsoDate } from '../../utils/date.js'

describe('utils/gantt', () => {
  describe('dateToPixel', () => {
    it('zero offset for date == viewStart', () => {
      const d = parseIsoDate('2026-04-15')
      expect(dateToPixel(d, d, 0.001)).toBe(0)
    })

    it('positive for date after viewStart', () => {
      const start = parseIsoDate('2026-04-15')
      const date = parseIsoDate('2026-04-20')
      const ms = date.valueOf() - start.valueOf()
      expect(dateToPixel(date, start, 0.001)).toBeCloseTo(ms * 0.001)
    })

    it('negative for date before viewStart', () => {
      const start = parseIsoDate('2026-04-15')
      const date = parseIsoDate('2026-04-10')
      expect(dateToPixel(date, start, 0.001)).toBeLessThan(0)
    })
  })

  describe('bookingWidth', () => {
    it('proportional to duration', () => {
      const a = parseIsoDate('2026-04-15')
      const b = parseIsoDate('2026-04-20') // 5 days
      const w = bookingWidth(a, b, 0.001)
      const expected = (5 * 86_400_000) * 0.001
      expect(w).toBeCloseTo(expected)
    })

    it('clamps to minimum 2px for zero-duration / equal dates', () => {
      const a = parseIsoDate('2026-04-15')
      expect(bookingWidth(a, a, 0.001)).toBe(2)
    })

    it('clamps to minimum 2px when computed width < 2', () => {
      const a = parseIsoDate('2026-04-15')
      const b = parseIsoDate('2026-04-15') // 0 duration
      expect(bookingWidth(a, b, 0.0001)).toBe(2)
    })
  })

  describe('generateTopLevelDates (months)', () => {
    it('returns one cell when range is within a single month', () => {
      const cells = generateTopLevelDates(parseIsoDate('2026-04-01'), parseIsoDate('2026-04-14'), 'en')
      expect(cells).toHaveLength(1)
      expect(cells[0].label).toBe('April 2026')
      expect(cells[0].days).toBe(14)
    })

    it('returns two cells when range spans month boundary', () => {
      const cells = generateTopLevelDates(parseIsoDate('2026-04-25'), parseIsoDate('2026-05-05'), 'en')
      expect(cells).toHaveLength(2)
      expect(cells[0].label).toBe('April 2026')
      expect(cells[1].label).toBe('May 2026')
      // April 25..30 = 6 days; May 1..5 = 5 days; total 11 days inclusive
      expect(cells[0].days).toBe(6)
      expect(cells[1].days).toBe(5)
      expect(cells.reduce((sum, c) => sum + c.days, 0)).toBe(11)
    })

    it('flags isCurrentMonth for the calendar month containing today', () => {
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const cells = generateTopLevelDates(start, end, 'en')
      expect(cells[0].isCurrentMonth).toBe(true)
    })
  })

  describe('generateBottomLevelDates (days)', () => {
    it('returns N+1 entries for an N-day inclusive range', () => {
      const cells = generateBottomLevelDates(parseIsoDate('2026-04-15'), parseIsoDate('2026-04-21'), 'en')
      expect(cells).toHaveLength(7)
    })

    it('flags isToday only for today', () => {
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)
      const cells = generateBottomLevelDates(start, end, 'en')
      expect(cells[0].isToday).toBe(true)
      expect(cells[1].isToday).toBe(false)
      expect(cells[2].isToday).toBe(false)
    })

    it('flags isWeekend for Sat/Sun', () => {
      // 2026-04-18 is Saturday, 2026-04-19 Sunday
      const cells = generateBottomLevelDates(parseIsoDate('2026-04-17'), parseIsoDate('2026-04-20'), 'en')
      expect(cells[0].isWeekend).toBe(false) // Fri
      expect(cells[1].isWeekend).toBe(true)  // Sat
      expect(cells[2].isWeekend).toBe(true)  // Sun
      expect(cells[3].isWeekend).toBe(false) // Mon
    })
  })

  describe('assignLanes', () => {
    const mk = (id, from, to) => ({
      id, _start: parseIsoDate(from), _end: parseIsoDate(to),
    })

    it('returns empty for null/empty input', () => {
      expect(assignLanes(null)).toEqual({ lanes: {}, maxLane: 0 })
      expect(assignLanes([])).toEqual({ lanes: {}, maxLane: 0 })
    })

    it('puts a single booking in lane 0', () => {
      const r = mk('a', '2026-04-15', '2026-04-20')
      const { lanes, maxLane } = assignLanes([r])
      expect(lanes).toEqual({ a: 0 })
      expect(maxLane).toBe(1)
    })

    it('puts non-overlapping sequence in lane 0', () => {
      const items = [
        mk('a', '2026-04-15', '2026-04-18'),
        mk('b', '2026-04-18', '2026-04-22'), // touches but does not overlap
        mk('c', '2026-04-22', '2026-04-25'),
      ]
      const { lanes, maxLane } = assignLanes(items)
      expect(lanes).toEqual({ a: 0, b: 0, c: 0 })
      expect(maxLane).toBe(1)
    })

    it('stacks 2 overlapping bookings into lanes 0 and 1', () => {
      const items = [
        mk('a', '2026-04-15', '2026-04-22'),
        mk('b', '2026-04-18', '2026-04-25'),
      ]
      const { lanes, maxLane } = assignLanes(items)
      expect(lanes).toEqual({ a: 0, b: 1 })
      expect(maxLane).toBe(2)
    })

    it('stacks 3 overlapping bookings into lanes 0, 1, 2', () => {
      const items = [
        mk('a', '2026-04-15', '2026-04-22'),
        mk('b', '2026-04-16', '2026-04-23'),
        mk('c', '2026-04-17', '2026-04-24'),
      ]
      const { lanes, maxLane } = assignLanes(items)
      expect(lanes.a).toBe(0)
      expect(lanes.b).toBe(1)
      expect(lanes.c).toBe(2)
      expect(maxLane).toBe(3)
    })

    it('reuses earliest free lane when item slots into a gap', () => {
      // a in lane 0 ends 04-18; c starts 04-19 → fits lane 0; b in lane 1.
      const items = [
        mk('a', '2026-04-15', '2026-04-18'),
        mk('b', '2026-04-16', '2026-04-25'),
        mk('c', '2026-04-19', '2026-04-23'),
      ]
      const { lanes, maxLane } = assignLanes(items)
      expect(lanes.a).toBe(0)
      expect(lanes.b).toBe(1)
      expect(lanes.c).toBe(0)
      expect(maxLane).toBe(2)
    })

    it('places longer item first when starts tie', () => {
      const items = [
        mk('short', '2026-04-15', '2026-04-16'),
        mk('long', '2026-04-15', '2026-04-25'),
      ]
      const { lanes } = assignLanes(items)
      expect(lanes.long).toBe(0)
      expect(lanes.short).toBe(1)
    })
  })
})
