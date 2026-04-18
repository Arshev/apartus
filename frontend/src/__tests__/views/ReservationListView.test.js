import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue('t'),
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../api/reservations', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(),
  destroy: vi.fn().mockResolvedValue({}),
  checkIn: vi.fn().mockResolvedValue({ id: 1, status: 'checked_in' }),
  checkOut: vi.fn().mockResolvedValue({ id: 1, status: 'checked_out' }),
  cancel: vi.fn().mockResolvedValue({ id: 1, status: 'cancelled' }),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import ReservationListView from '../../views/ReservationListView.vue'
import { useReservationsStore } from '../../stores/reservations'

describe('ReservationListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('statusColor / statusLabel / formatPrice', () => {
    const wrapper = mountWithPrimeVue(ReservationListView)
    expect(wrapper.vm.statusColor('confirmed')).toBe('status-confirmed')
    expect(wrapper.vm.statusColor('checked_in')).toBe('status-checked-in')
    expect(wrapper.vm.statusLabel('cancelled')).toBe('Отменено')
    expect(wrapper.vm.formatPrice(15000)).toContain('150')
    expect(wrapper.vm.formatPrice(0)).toBe('—')
  })

  it('confirmDelete does not throw (wires to useConfirm)', () => {
    const wrapper = mountWithPrimeVue(ReservationListView)
    expect(() => wrapper.vm.confirmDelete({ id: 1 })).not.toThrow()
  })

  it('handleDelete invokes API destroy', async () => {
    const api = await import('../../api/reservations')
    const wrapper = mountWithPrimeVue(ReservationListView)
    await wrapper.vm.handleDelete({ id: 42 })
    expect(api.destroy).toHaveBeenCalledWith(42)
  })

  it('doCheckIn calls store.checkIn', async () => {
    const wrapper = mountWithPrimeVue(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'checkIn').mockResolvedValue({})
    await wrapper.vm.doCheckIn({ id: 1 })
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('doCheckOut calls store.checkOut', async () => {
    const wrapper = mountWithPrimeVue(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'checkOut').mockResolvedValue({})
    await wrapper.vm.doCheckOut({ id: 1 })
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('doCancel calls store.cancelReservation', async () => {
    const wrapper = mountWithPrimeVue(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'cancelReservation').mockResolvedValue({})
    await wrapper.vm.doCancel({ id: 1 })
    expect(spy).toHaveBeenCalledWith(1)
  })
})
