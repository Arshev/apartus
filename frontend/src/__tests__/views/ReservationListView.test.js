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

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ReservationListView from '../../views/ReservationListView.vue'
import { useReservationsStore } from '../../stores/reservations'

/** Sample reservation used for descriptor-aware confirm tests. */
const SAMPLE_ITEM = {
  id: 1,
  guest_name: 'Иванов Алексей',
  unit_name: 'Квартира 5',
  check_in: '2026-05-01',
  check_out: '2026-05-03',
  status: 'checked_in',
}

describe('ReservationListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('headers — 6 columns (guest consolidates unit)', () => {
    const wrapper = mountWithVuetify(ReservationListView)
    expect(wrapper.vm.headers.map((h) => h.key)).toEqual([
      'guest_name', 'check_in', 'check_out', 'status', 'total_price_cents', 'actions',
    ])
  })

  it('statusColor / statusLabel / formatPrice', () => {
    const wrapper = mountWithVuetify(ReservationListView)
    expect(wrapper.vm.statusColor('confirmed')).toBe('status-confirmed')
    expect(wrapper.vm.statusColor('checked_in')).toBe('status-checked-in')
    expect(wrapper.vm.statusLabel('cancelled')).toBe('Отменено')
    expect(wrapper.vm.formatPrice(15000)).toContain('150')
    expect(wrapper.vm.formatPrice(0)).toBe('—')
  })

  it('confirmDelete opens dialog; runConfirm triggers store.destroy', async () => {
    const wrapper = mountWithVuetify(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'destroy').mockResolvedValue({})
    wrapper.vm.confirmDelete({ id: 1 })
    expect(wrapper.vm.confirmDialog.open).toBe(true)
    await wrapper.vm.runConfirm()
    expect(spy).toHaveBeenCalledWith(1)
    expect(wrapper.vm.confirmDialog.open).toBe(false)
  })

  it('doCheckIn calls store.checkIn directly (no confirm)', async () => {
    const wrapper = mountWithVuetify(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'checkIn').mockResolvedValue({})
    await wrapper.vm.doCheckIn({ id: 1 })
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('doCheckOut opens confirm; runConfirm triggers store.checkOut', async () => {
    const wrapper = mountWithVuetify(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'checkOut').mockResolvedValue({})
    wrapper.vm.doCheckOut(SAMPLE_ITEM)
    expect(wrapper.vm.confirmDialog.open).toBe(true)
    await wrapper.vm.runConfirm()
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('doCancel opens confirm; runConfirm triggers store.cancelReservation', async () => {
    const wrapper = mountWithVuetify(ReservationListView)
    const store = useReservationsStore()
    const spy = vi.spyOn(store, 'cancelReservation').mockResolvedValue({})
    wrapper.vm.doCancel(SAMPLE_ITEM)
    expect(wrapper.vm.confirmDialog.open).toBe(true)
    await wrapper.vm.runConfirm()
    expect(spy).toHaveBeenCalledWith(1)
  })
})
