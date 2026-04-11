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
})
