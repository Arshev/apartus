// Native Date helpers for FT-020 Gantt Calendar.
// Scope and rationale fixed in feature.md / CON-01 — adding a new operation
// here requires updating that contract.

const MS_PER_DAY = 86_400_000

/**
 * Parse a "YYYY-MM-DD" string from the API into a local-tz Date at midnight.
 * Avoids the `new Date("2026-04-15")` UTC trap that yields off-by-one in
 * negative-UTC-offset locales.
 * @param {string} str
 * @returns {Date}
 */
export function parseIsoDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Return a new Date n days after `d`. Negative n moves backward.
 * @param {Date} d
 * @param {number} n
 * @returns {Date}
 */
export function addDays(d, n) {
  return new Date(d.valueOf() + n * MS_PER_DAY)
}

/**
 * Return a new Date at 00:00:00 local time of the same calendar day.
 * @param {Date} d
 * @returns {Date}
 */
export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * First day of the month at 00:00:00 local time.
 * @param {Date} d
 * @returns {Date}
 */
export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/**
 * Last day of the month at 00:00:00 local time.
 * @param {Date} d
 * @returns {Date}
 */
export function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/**
 * Whole-day distance from `a` to `b` (b - a). DST-safe via rounding.
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
export function diffDays(a, b) {
  return Math.round((startOfDay(b).valueOf() - startOfDay(a).valueOf()) / MS_PER_DAY)
}

/**
 * "April 2026" / "Апрель 2026" depending on locale.
 * @param {Date} d
 * @param {string} locale
 * @returns {string}
 */
export function formatMonth(d, locale = 'ru') {
  return d.toLocaleString(locale, { month: 'long', year: 'numeric' })
}

/**
 * "15 апр." / "Apr 15" depending on locale.
 * @param {Date} d
 * @param {string} locale
 * @returns {string}
 */
export function formatShortDate(d, locale = 'ru') {
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

/**
 * Format Date back to "YYYY-MM-DD" string for API requests.
 * @param {Date} d
 * @returns {string}
 */
export function formatIsoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
