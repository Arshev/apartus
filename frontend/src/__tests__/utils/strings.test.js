import { describe, it, expect } from 'vitest'
import { abbreviateUnit } from '../../utils/strings.js'

describe('utils/strings.abbreviateUnit', () => {
  describe('standard unit names from seed (digit-aware per FT-032)', () => {
    it('"Deluxe Suite 201" → "D2" (letter + first digit)', () => {
      expect(abbreviateUnit('Deluxe Suite 201')).toBe('D2')
    })

    it('"Standard Room 101" → "S1"', () => {
      expect(abbreviateUnit('Standard Room 101')).toBe('S1')
    })

    it('"Main Studio" → "MA" (no digits, two-letter rule)', () => {
      expect(abbreviateUnit('Main Studio')).toBe('MA')
    })

    it('"Sofa bed" → "SO" (no digits, two-letter rule)', () => {
      expect(abbreviateUnit('Sofa bed')).toBe('SO')
    })

    it('"Dorm 6A" → "D6"', () => {
      expect(abbreviateUnit('Dorm 6A')).toBe('D6')
    })

    it('"Dorm 8B" → "D8" (distinct from Dorm 6A — the FT-032 fix)', () => {
      expect(abbreviateUnit('Dorm 8B')).toBe('D8')
    })

    it('collision resolved: "Dorm 6A" and "Dorm 8B" abbreviate differently', () => {
      expect(abbreviateUnit('Dorm 6A')).not.toBe(abbreviateUnit('Dorm 8B'))
    })
  })

  describe('stop-words skipped', () => {
    it('"The Penthouse" → "PE" (skip "The")', () => {
      expect(abbreviateUnit('The Penthouse')).toBe('PE')
    })

    it('"A Studio" → "ST" (skip "A")', () => {
      expect(abbreviateUnit('A Studio')).toBe('ST')
    })

    it('"An Apartment" → "AP" (skip "An")', () => {
      expect(abbreviateUnit('An Apartment')).toBe('AP')
    })
  })

  describe('Cyrillic names', () => {
    it('"Люкс 101" → "Л1" (digit-aware)', () => {
      expect(abbreviateUnit('Люкс 101')).toBe('Л1')
    })

    it('"Студия Морская" → "СТ" (no digits — two-letter rule)', () => {
      expect(abbreviateUnit('Студия Морская')).toBe('СТ')
    })

    it('"Номер 12 Б" → "Н1"', () => {
      expect(abbreviateUnit('Номер 12 Б')).toBe('Н1')
    })
  })

  describe('edge cases', () => {
    it('empty string → "??"', () => {
      expect(abbreviateUnit('')).toBe('??')
    })

    it('whitespace-only → "??"', () => {
      expect(abbreviateUnit('   ')).toBe('??')
    })

    it('null → "??"', () => {
      expect(abbreviateUnit(null)).toBe('??')
    })

    it('undefined → "??"', () => {
      expect(abbreviateUnit(undefined)).toBe('??')
    })

    it('non-string → "??"', () => {
      expect(abbreviateUnit(42)).toBe('??')
    })

    it('single char → duplicated', () => {
      expect(abbreviateUnit('X')).toBe('XX')
    })

    it('single digit → duplicated', () => {
      expect(abbreviateUnit('7')).toBe('77')
    })
  })

  describe('all stop-words fallback', () => {
    it('"The a an" → falls back to alnum first 2 chars', () => {
      // No significant word (all stop-words, all short).
      // Alnum from "The a an" → "Theaan" → "TH"
      expect(abbreviateUnit('The a an')).toBe('TH')
    })
  })
})
