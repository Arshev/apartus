import { describe, it, expect } from 'vitest'
import {
  parseIsoDate,
  addDays,
  startOfDay,
  startOfMonth,
  endOfMonth,
  diffDays,
  formatMonth,
  formatShortDate,
  formatIsoDate,
} from '../../utils/date.js'

describe('utils/date', () => {
  describe('parseIsoDate', () => {
    it('parses "YYYY-MM-DD" into local-tz midnight Date', () => {
      const d = parseIsoDate('2026-04-15')
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(3) // April (0-indexed)
      expect(d.getDate()).toBe(15)
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
    })

    // Regression guard for the UTC parsing trap. `new Date("2026-04-15")` is
    // UTC midnight; if a viewer is in a negative-UTC-offset zone (e.g. PST)
    // it renders as 2026-04-14. parseIsoDate must always give the same calendar
    // day regardless of host TZ.
    it('returns the same calendar day regardless of host timezone offset', () => {
      const d = parseIsoDate('2026-04-15')
      // Compare against fresh construction via Date(y, m, d) — always local.
      const expected = new Date(2026, 3, 15)
      expect(d.valueOf()).toBe(expected.valueOf())
    })
  })

  describe('addDays', () => {
    it('moves forward by N days', () => {
      const d = parseIsoDate('2026-04-15')
      expect(formatIsoDate(addDays(d, 7))).toBe('2026-04-22')
    })

    it('moves backward with negative N', () => {
      const d = parseIsoDate('2026-04-15')
      expect(formatIsoDate(addDays(d, -10))).toBe('2026-04-05')
    })

    it('crosses month boundary', () => {
      const d = parseIsoDate('2026-04-28')
      expect(formatIsoDate(addDays(d, 5))).toBe('2026-05-03')
    })

    it('crosses year boundary', () => {
      const d = parseIsoDate('2026-12-30')
      expect(formatIsoDate(addDays(d, 3))).toBe('2027-01-02')
    })
  })

  describe('startOfDay', () => {
    it('drops time component', () => {
      const d = new Date(2026, 3, 15, 14, 30, 45, 999)
      const s = startOfDay(d)
      expect(s.getHours()).toBe(0)
      expect(s.getMinutes()).toBe(0)
      expect(s.getSeconds()).toBe(0)
      expect(s.getMilliseconds()).toBe(0)
      expect(s.getDate()).toBe(15)
    })
  })

  describe('startOfMonth / endOfMonth', () => {
    it('startOfMonth returns 1st day at midnight', () => {
      const d = parseIsoDate('2026-04-15')
      expect(formatIsoDate(startOfMonth(d))).toBe('2026-04-01')
    })

    it('endOfMonth returns last day (April → 30, July → 31, Feb leap → 29)', () => {
      expect(formatIsoDate(endOfMonth(parseIsoDate('2026-04-15')))).toBe('2026-04-30')
      expect(formatIsoDate(endOfMonth(parseIsoDate('2026-07-01')))).toBe('2026-07-31')
      // 2024 is leap
      expect(formatIsoDate(endOfMonth(parseIsoDate('2024-02-10')))).toBe('2024-02-29')
      // 2026 is not leap
      expect(formatIsoDate(endOfMonth(parseIsoDate('2026-02-10')))).toBe('2026-02-28')
    })
  })

  describe('diffDays', () => {
    it('returns whole-day distance in calendar days', () => {
      expect(diffDays(parseIsoDate('2026-04-15'), parseIsoDate('2026-04-22'))).toBe(7)
    })

    it('returns negative when b is before a', () => {
      expect(diffDays(parseIsoDate('2026-04-22'), parseIsoDate('2026-04-15'))).toBe(-7)
    })

    it('returns 0 for same calendar day even with different times', () => {
      const a = new Date(2026, 3, 15, 8)
      const b = new Date(2026, 3, 15, 23, 59)
      expect(diffDays(a, b)).toBe(0)
    })
  })

  describe('formatMonth', () => {
    it('formats Russian "Апрель 2026"', () => {
      const d = parseIsoDate('2026-04-15')
      // Locale-string can render as "апрель 2026 г." in some impls; assert
      // contains month + year rather than exact equality.
      const out = formatMonth(d, 'ru').toLowerCase()
      expect(out).toContain('апрел')
      expect(out).toContain('2026')
    })

    it('formats English "April 2026"', () => {
      expect(formatMonth(parseIsoDate('2026-04-15'), 'en')).toBe('April 2026')
    })
  })

  describe('formatShortDate', () => {
    it('formats short month + day in ru', () => {
      const out = formatShortDate(parseIsoDate('2026-04-15'), 'ru').toLowerCase()
      expect(out).toContain('15')
      expect(out).toMatch(/апр/)
    })

    it('formats short month + day in en', () => {
      expect(formatShortDate(parseIsoDate('2026-04-15'), 'en')).toBe('Apr 15')
    })
  })

  describe('formatIsoDate', () => {
    it('round-trips parseIsoDate', () => {
      expect(formatIsoDate(parseIsoDate('2026-04-15'))).toBe('2026-04-15')
    })

    it('zero-pads single-digit months and days', () => {
      expect(formatIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    })
  })
})
