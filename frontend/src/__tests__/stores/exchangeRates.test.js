import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/exchangeRates', () => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
}))

import * as api from '../../api/exchangeRates'
import { useExchangeRatesStore } from '../../stores/exchangeRates'

const API_RATE = {
  id: 1,
  base_currency: 'USD',
  quote_currency: 'RUB',
  rate_x1e10: 955000000000,
  effective_date: '2026-04-24',
  source: 'api',
  organization_id: null,
}

const MANUAL_RATE = {
  id: 2,
  base_currency: 'USD',
  quote_currency: 'RUB',
  rate_x1e10: 1000000000000,
  effective_date: '2026-04-24',
  source: 'manual',
  organization_id: 42,
  note: 'CBR daily',
}

describe('useExchangeRatesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchAll', () => {
    it('populates apiRates and manualOverrides', async () => {
      api.list.mockResolvedValue({
        api_rates: [API_RATE],
        manual_overrides: [MANUAL_RATE],
      })
      const store = useExchangeRatesStore()
      await store.fetchAll()
      expect(store.apiRates).toEqual([API_RATE])
      expect(store.manualOverrides).toEqual([MANUAL_RATE])
    })

    it('surfaces error and resets lists', async () => {
      api.list.mockRejectedValue({ response: { data: { error: 'oops' } } })
      const store = useExchangeRatesStore()
      await store.fetchAll()
      expect(store.error).toBe('oops')
      expect(store.apiRates).toEqual([])
      expect(store.manualOverrides).toEqual([])
    })
  })

  describe('createOverride', () => {
    it('prepends created rate to manualOverrides', async () => {
      api.create.mockResolvedValue(MANUAL_RATE)
      const store = useExchangeRatesStore()
      const result = await store.createOverride({ base_currency: 'USD' })
      expect(result).toEqual(MANUAL_RATE)
      expect(store.manualOverrides[0]).toEqual(MANUAL_RATE)
    })

    it('throws on failure and sets error', async () => {
      api.create.mockRejectedValue({ response: { data: { error: ['bad'] } } })
      const store = useExchangeRatesStore()
      await expect(store.createOverride({})).rejects.toBeTruthy()
      expect(store.error).toEqual(['bad'])
    })
  })

  describe('updateOverride', () => {
    it('replaces matching rate in list', async () => {
      const store = useExchangeRatesStore()
      store.manualOverrides = [MANUAL_RATE]
      const updated = { ...MANUAL_RATE, rate_x1e10: 1100000000000 }
      api.update.mockResolvedValue(updated)
      await store.updateOverride(MANUAL_RATE.id, { rate_x1e10: 1100000000000 })
      expect(store.manualOverrides[0].rate_x1e10).toBe(1100000000000)
    })
  })

  describe('deleteOverride', () => {
    it('removes rate from list', async () => {
      const store = useExchangeRatesStore()
      store.manualOverrides = [MANUAL_RATE]
      api.destroy.mockResolvedValue({ message: 'Deleted' })
      await store.deleteOverride(MANUAL_RATE.id)
      expect(store.manualOverrides).toEqual([])
    })
  })

  describe('rateAsMajorUnit', () => {
    it('converts rate_x1e10 to human-readable major-unit number string', () => {
      const store = useExchangeRatesStore()
      expect(store.rateAsMajorUnit(955000000000)).toBe('95.5')
      expect(store.rateAsMajorUnit(9200000000)).toBe('0.92')
      expect(store.rateAsMajorUnit(1000000000000)).toBe('100')
      expect(store.rateAsMajorUnit(null)).toBe('—')
    })
  })
})
