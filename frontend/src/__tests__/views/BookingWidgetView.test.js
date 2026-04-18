import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/publicBooking', () => ({
  getAvailability: vi.fn().mockResolvedValue({
    organization: 'Test Org',
    currency: 'RUB',
    units: [{ id: 1, name: 'Room 1', property_name: 'Hotel A', unit_type: 'room', capacity: 2, total_price_cents: 10000 }],
  }),
  createBooking: vi.fn().mockResolvedValue({ id: 1 }),
}))
vi.mock('../../utils/currency', () => ({
  formatMoney: vi.fn((cents) => `${(cents / 100).toFixed(0)} ₽`),
}))

import { mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import BookingWidgetView from '../../views/BookingWidgetView.vue'
import * as publicBookingApi from '../../api/publicBooking'

describe('BookingWidgetView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function mount() {
    return mountWithPrimeVueAsync(BookingWidgetView, {
      routes: [{ path: '/book/:slug', component: BookingWidgetView }],
      initialRoute: '/book/test-org',
    })
  }

  it('formatPrice formats cents to human-readable', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.formatPrice(10000)).toContain('100')
  })

  it('formatPrice returns "Бесплатно" for 0', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.formatPrice(0)).toBe('Бесплатно')
  })

  it('search skips when dates empty', async () => {
    const wrapper = await mount()
    await wrapper.vm.search()
    expect(publicBookingApi.getAvailability).not.toHaveBeenCalled()
  })

  it('search fetches availability', async () => {
    const wrapper = await mount()
    wrapper.vm.checkIn = '2026-05-01'
    wrapper.vm.checkOut = '2026-05-03'
    await wrapper.vm.search()
    expect(publicBookingApi.getAvailability).toHaveBeenCalled()
    expect(wrapper.vm.units.length).toBe(1)
    expect(wrapper.vm.orgName).toBe('Test Org')
  })

  it('selectUnit opens booking dialog', async () => {
    const wrapper = await mount()
    const unit = { id: 1, name: 'Room 1' }
    wrapper.vm.selectUnit(unit)
    expect(wrapper.vm.bookingDialog).toBe(true)
    expect(wrapper.vm.selectedUnit).toEqual(unit)
  })

  it('confirmBooking calls API and shows success', async () => {
    const wrapper = await mount()
    wrapper.vm.selectedUnit = { id: 1 }
    wrapper.vm.checkIn = '2026-05-01'
    wrapper.vm.checkOut = '2026-05-03'
    await wrapper.vm.confirmBooking()
    expect(publicBookingApi.createBooking).toHaveBeenCalled()
    expect(wrapper.vm.successDialog).toBe(true)
  })

  it('search sets error on failure', async () => {
    publicBookingApi.getAvailability.mockRejectedValueOnce(new Error('fail'))
    const wrapper = await mount()
    wrapper.vm.checkIn = '2026-05-01'
    wrapper.vm.checkOut = '2026-05-03'
    await wrapper.vm.search()
    expect(wrapper.vm.error).toBe('Не удалось загрузить доступность')
  })
})
