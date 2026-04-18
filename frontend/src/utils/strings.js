// FT-030: Abbreviate a unit name to two uppercase characters — used in the
// collapsed Gantt sidebar where only 48px of horizontal space is available.
//
// Rule (digit-aware; updated by FT-032 to disambiguate typical unit-naming
// patterns like "Dorm 6A" vs "Dorm 8B" which both collapsed to "DO" before):
//   1. Take the first "significant" word — skip English stop-words ("the",
//      "a", "an") and tokens shorter than 2 characters.
//   2. If the WHOLE input contains any digit anywhere, return the first
//      letter of the significant word + the first digit found anywhere in
//      the name. This preserves the numeric disambiguator that typical unit
//      names carry ("Dorm 6A" → "D6", "Studio 204" → "S2", "Люкс 101" → "Л1").
//   3. Otherwise return the first 2 characters of the significant word,
//      uppercased ("Deluxe Suite" → "DE", "Main Studio" → "MA").
//   4. If no significant word found, fall back to the first 2 alphanumeric
//      characters of the whole string, uppercased.
//   5. Single-char input → duplicated. Empty / non-string / nothing-to-show → "??".
//
// Examples:
//   "Deluxe Suite 201"    → "D2"   (letter of "Deluxe" + digit "2")
//   "Standard Room 101"   → "S1"
//   "Main Studio"         → "MA"   (no digits — two-letter rule)
//   "Sofa bed"            → "SO"
//   "Dorm 6A"             → "D6"
//   "Dorm 8B"             → "D8"   (distinct from 6A — the fix)
//   "Люкс 101"            → "Л1"
//   "A 12"                → "12"   (single-letter skipped, digit fallback)
//   ""                    → "??"
//   null / undefined      → "??"
const STOP_WORDS = new Set(['the', 'a', 'an'])

export function abbreviateUnit(name) {
  if (typeof name !== 'string' || name.trim() === '') return '??'

  const words = name.split(/\s+/).filter((w) => w.length > 0)
  const significant = words.find((w) => w.length >= 2 && !STOP_WORDS.has(w.toLowerCase()))

  // FT-032: digit-aware branch — if the name contains any digit, use
  // first-letter + first-digit so unit numbers like "6A" vs "8B" differentiate.
  const digitMatch = name.match(/\d/)
  if (digitMatch && significant) {
    return (significant.charAt(0) + digitMatch[0]).toUpperCase()
  }

  if (significant) {
    return significant.slice(0, 2).toUpperCase()
  }

  // Fallback: strip non-alphanumerics and take first 2 chars.
  const alnum = name.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '')
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase()
  if (alnum.length === 1) return (alnum + alnum).toUpperCase()

  return '??'
}
