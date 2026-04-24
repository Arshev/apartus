import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../api/exchangeRates', () => ({
  list: vi.fn().mockResolvedValue({ api_rates: [], manual_overrides: [] }),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({ id: 1 }),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import CurrencyRatesView from '../../../views/settings/CurrencyRatesView.vue'
import { useExchangeRatesStore } from '../../../stores/exchangeRates'

describe('CurrencyRatesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has api and manual headers', () => {
    const wrapper = mountWithVuetify(CurrencyRatesView)
    const apiKeys = wrapper.vm.apiHeaders.map((h) => h.key)
    const manualKeys = wrapper.vm.manualHeaders.map((h) => h.key)
    expect(apiKeys).toEqual(
      expect.arrayContaining(['base_currency', 'quote_currency', 'rate_x1e10', 'effective_date']),
    )
    expect(manualKeys).toEqual(
      expect.arrayContaining([
        'base_currency',
        'quote_currency',
        'rate_x1e10',
        'effective_date',
        'note',
        'actions',
      ]),
    )
  })

  it('openCreate resets form with default USD→RUB', () => {
    const wrapper = mountWithVuetify(CurrencyRatesView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editing).toBeNull()
    expect(wrapper.vm.form.base_currency).toBe('USD')
    expect(wrapper.vm.form.quote_currency).toBe('RUB')
  })

  it('openEdit converts rate_x1e10 to major unit', () => {
    const wrapper = mountWithVuetify(CurrencyRatesView)
    wrapper.vm.openEdit({
      id: 42,
      base_currency: 'USD',
      quote_currency: 'RUB',
      rate_x1e10: 1000000000000,
      effective_date: '2026-04-24',
      note: 'CBR',
    })
    expect(wrapper.vm.editing.id).toBe(42)
    expect(wrapper.vm.form.rate).toBe(100)
    expect(wrapper.vm.form.note).toBe('CBR')
  })

  it('handleSubmit calls createOverride with rate_x1e10 on new record', async () => {
    const wrapper = mountWithVuetify(CurrencyRatesView)
    const store = useExchangeRatesStore()
    const spy = vi.spyOn(store, 'createOverride').mockResolvedValue({ id: 1 })
    wrapper.vm.openCreate()
    wrapper.vm.form.rate = 100
    wrapper.vm.form.effective_date = '2026-04-24'
    await wrapper.vm.handleSubmit()
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        base_currency: 'USD',
        quote_currency: 'RUB',
        rate_x1e10: 1000000000000,
        effective_date: '2026-04-24',
      }),
    )
  })

  it('confirmDelete + handleDelete invokes store.deleteOverride', async () => {
    const wrapper = mountWithVuetify(CurrencyRatesView)
    const store = useExchangeRatesStore()
    const spy = vi.spyOn(store, 'deleteOverride').mockResolvedValue()
    wrapper.vm.confirmDelete({ id: 99 })
    await wrapper.vm.handleDelete()
    expect(spy).toHaveBeenCalledWith(99)
  })
})
