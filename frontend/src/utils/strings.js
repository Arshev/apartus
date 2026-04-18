// FT-030: Abbreviate a unit name to two uppercase characters — used in the
// collapsed Gantt sidebar where only 48px of horizontal space is available.
//
// Rule (simplified — single pass):
//   1. Take the first "significant" word — skip English stop-words ("the",
//      "a", "an") and tokens shorter than 2 characters.
//   2. Return its first 2 characters, uppercased.
//   3. If no significant word is found, return the first 2 alphanumeric
//      characters of the whole string (after upcase).
//   4. Empty / non-string / nothing-to-show → "??".
//
// Examples:
//   "Deluxe Suite 201"    → "DE"
//   "Standard Room 101"   → "ST"
//   "Main Studio"         → "MA"
//   "Sofa bed"            → "SO"
//   "Dorm 6A"             → "DO"
//   "A 12"                → "12"   (single-char word skipped, fallback)
//   ""                    → "??"
//   null / undefined      → "??"
const STOP_WORDS = new Set(['the', 'a', 'an'])

export function abbreviateUnit(name) {
  if (typeof name !== 'string' || name.trim() === '') return '??'

  const words = name.split(/\s+/).filter((w) => w.length > 0)
  const significant = words.find((w) => w.length >= 2 && !STOP_WORDS.has(w.toLowerCase()))

  if (significant) {
    return significant.slice(0, 2).toUpperCase()
  }

  // Fallback: strip non-alphanumerics and take first 2 chars.
  const alnum = name.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '')
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase()
  if (alnum.length === 1) return (alnum + alnum).toUpperCase()

  return '??'
}
