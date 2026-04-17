import { describe, it, expect } from 'vitest'
import { abbreviateUnit } from '../../utils/strings.js'

describe('utils/strings.abbreviateUnit', () => {
  describe('standard unit names from seed', () => {
    it('"Deluxe Suite 201" → "DE"', () => {
      expect(abbreviateUnit('Deluxe Suite 201')).toBe('DE')
    })

    it('"Standard Room 101" → "ST"', () => {
      expect(abbreviateUnit('Standard Room 101')).toBe('ST')
    })

    it('"Main Studio" → "MA"', () => {
      expect(abbreviateUnit('Main Studio')).toBe('MA')
    })

    it('"Sofa bed" → "SO"', () => {
      expect(abbreviateUnit('Sofa bed')).toBe('SO')
    })

    it('"Dorm 6A" → "DO"', () => {
      expect(abbreviateUnit('Dorm 6A')).toBe('DO')
    })

    it('"Dorm 8B" → "DO"', () => {
      expect(abbreviateUnit('Dorm 8B')).toBe('DO')
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
    it('"Люкс 101" → "ЛЮ"', () => {
      expect(abbreviateUnit('Люкс 101')).toBe('ЛЮ')
    })

    it('"Студия Морская" → "СТ"', () => {
      expect(abbreviateUnit('Студия Морская')).toBe('СТ')
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
