import { describe, it, expect } from 'vitest'
import { formatMoney, centsToUnits, unitsToCents, CURRENCY_LIST } from '../../utils/currency'

describe('currency utils', () => {
  it('formatMoney RUB — symbol after', () => {
    expect(formatMoney(15000, 'RUB')).toBe('150.00 ₽')
  })

  it('formatMoney USD — symbol before', () => {
    expect(formatMoney(15000, 'USD')).toBe('$150.00')
  })

  it('formatMoney UZS — no decimals', () => {
    expect(formatMoney(150000, 'UZS')).toBe('1500 сўм')
  })

  it('formatMoney null returns —', () => {
    expect(formatMoney(null, 'RUB')).toBe('—')
  })

  it('formatMoney 0', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00')
  })

  it('centsToUnits', () => {
    expect(centsToUnits(5000)).toBe(50)
  })

  it('unitsToCents', () => {
    expect(unitsToCents(50)).toBe(5000)
    expect(unitsToCents(49.99)).toBe(4999)
  })

  it('CURRENCY_LIST has expected entries', () => {
    expect(CURRENCY_LIST.length).toBeGreaterThanOrEqual(10)
    expect(CURRENCY_LIST.find((c) => c.code === 'RUB')).toBeTruthy()
    expect(CURRENCY_LIST.find((c) => c.code === 'USD')).toBeTruthy()
  })

  // --- Deep edge cases ---

  it('formatMoney undefined returns —', () => {
    expect(formatMoney(undefined, 'RUB')).toBe('—')
  })

  it('formatMoney unknown currency falls back to USD format', () => {
    expect(formatMoney(10000, 'XYZ')).toBe('$100.00')
  })

  it('formatMoney negative cents', () => {
    expect(formatMoney(-5000, 'RUB')).toBe('-50.00 ₽')
  })

  it('formatMoney very large amount', () => {
    expect(formatMoney(100_000_000, 'USD')).toBe('$1000000.00')
  })

  it('formatMoney 1 cent', () => {
    expect(formatMoney(1, 'USD')).toBe('$0.01')
  })

  it('formatMoney IDR — zero decimal, symbol before', () => {
    expect(formatMoney(500_000, 'IDR')).toBe('Rp5000')
  })

  it('formatMoney AED — symbol after', () => {
    expect(formatMoney(10000, 'AED')).toBe('100.00 د.إ')
  })

  it('formatMoney defaults to RUB when no currency code', () => {
    expect(formatMoney(10000)).toBe('100.00 ₽')
  })

  it('centsToUnits handles 0', () => {
    expect(centsToUnits(0)).toBe(0)
  })

  it('centsToUnits handles negative', () => {
    expect(centsToUnits(-500)).toBe(-5)
  })

  it('unitsToCents rounds fractional cents', () => {
    // 33.33 * 100 = 3333.0000...04 → should round to 3333
    expect(unitsToCents(33.33)).toBe(3333)
  })

  it('unitsToCents handles 0', () => {
    expect(unitsToCents(0)).toBe(0)
  })

  it('CURRENCY_LIST entries have code, label, symbol, decimalPlaces', () => {
    const rub = CURRENCY_LIST.find((c) => c.code === 'RUB')
    expect(rub.label).toBe('RUB (₽)')
    expect(rub.symbol).toBe('₽')
    expect(rub.decimalPlaces).toBe(2)
    expect(rub.position).toBe('after')
  })

  it('CURRENCY_LIST UZS has zero decimal places', () => {
    const uzs = CURRENCY_LIST.find((c) => c.code === 'UZS')
    expect(uzs.decimalPlaces).toBe(0)
  })
})
