import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/reservations', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(),
  destroy: vi.fn().mockResolvedValue({}),
  checkIn: vi.fn().mockResolvedValue({ id: 1, status: 'checked_in' }),
  checkOut: vi.fn().mockResolvedValue({ id: 1, status: 'checked_out' }),
  cancel: vi.fn().mockResolvedValue({ id: 1, status: 'cancelled' }),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ReservationListView from '../../views/ReservationListView.vue'
import { useReservationsStore } from '../../stores/reservations'

describe('ReservationListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct headers', () => {
    const wrapper = mountWithVuetify(ReservationListView)
    expect(wrapper.vm.headers.map((h) => h.key)).toEqual([
      'unit_name', 'guest_name', 'check_in', 'check_out', 'status', 'total_price_cents', 'actions',
    ])
  })

  it('statusColor / statusLabel / formatPrice', () => {
    const wrapper = mountWithVuetify(ReservationListView)
    expect(wrapper.vm.statusColor('confirmed')).toBe('blue')
    expect(wrapper.vm.statusColor('checked_in')).toBe('green')
    expect(wrapper.vm.statusLabel('cancelled')).toBe('Отменено')
    expect(wrapper.vm.formatPrice(15000)).toBe('150.00 ₽')
    expect(wrapper.vm.formatPrice(0)).toBe('—')
  })

  it('confirmDelete + handleDelete', async () => {
    const wrapper = mountWithVuetify(ReservationListView)
    const store = useReservationsStore()
    vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1 })
    await wrapper.vm.handleDelete()
    expect(store.destroy).toHaveBeenCalledWith(1)
  })

  it('doCheckIn calls store.checkIn', async () => {
    const wrapper = mountWithVuetify(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'checkIn').mockResolvedValue({})
    await wrapper.vm.doCheckIn({ id: 1 })
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('doCheckOut calls store.checkOut', async () => {
    const wrapper = mountWithVuetify(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'checkOut').mockResolvedValue({})
    await wrapper.vm.doCheckOut({ id: 1 })
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('doCancel calls store.cancelReservation', async () => {
    const wrapper = mountWithVuetify(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'cancelReservation').mockResolvedValue({})
    await wrapper.vm.doCancel({ id: 1 })
    expect(spy).toHaveBeenCalledWith(1)
  })
})
