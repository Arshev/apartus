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
  get: vi.fn().mockResolvedValue({
    unit_id: 1, guest_id: null, check_in: '2026-05-01', check_out: '2026-05-03',
    guests_count: 2, total_price_cents: 20000, notes: '',
  }),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({ id: 1 }),
  destroy: vi.fn(),
  checkIn: vi.fn(), checkOut: vi.fn(), cancel: vi.fn(),
}))
vi.mock('../../api/allUnits', () => ({
  list: vi.fn().mockResolvedValue([
    { id: 1, property_name: 'Hotel', name: 'Room 1', base_price_cents: 5000 },
  ]),
}))
vi.mock('../../api/guests', () => ({
  list: vi.fn().mockResolvedValue([
    { id: 1, first_name: 'John', last_name: 'Doe' },
  ]),
}))
vi.mock('../../api/seasonalPrices', () => ({
  list: vi.fn().mockResolvedValue([]),
}))

import { mountWithVuetifyAsync } from '../helpers/mountWithVuetify'
import ReservationFormView from '../../views/ReservationFormView.vue'
import { useReservationsStore } from '../../stores/reservations'

describe('ReservationFormView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function mount(route = '/reservations/new') {
    return mountWithVuetifyAsync(ReservationFormView, {
      routes: [
        { path: '/reservations/new', component: ReservationFormView },
        { path: '/reservations/:id/edit', component: ReservationFormView },
        { path: '/reservations', component: { template: '<div/>' } },
      ],
      initialRoute: route,
    })
  }

  it('isEdit is false for new reservation', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.isEdit).toBe(false)
  })

  it('isEdit is true for edit route', async () => {
    const wrapper = await mount('/reservations/1/edit')
    expect(wrapper.vm.isEdit).toBe(true)
  })

  it('loadSelectors populates units and guests', async () => {
    const wrapper = await mount()
    await wrapper.vm.loadSelectors()
    expect(wrapper.vm.units.length).toBe(1)
    expect(wrapper.vm.units[0].label).toContain('Hotel')
    expect(wrapper.vm.guests.length).toBe(1)
  })

  it('rules.required validates correctly', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.rules.required('')).toBe('Обязательное поле')
    expect(wrapper.vm.rules.required('test')).toBe(true)
  })

  it('rules.minOne validates correctly', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.rules.minOne(0)).toBe('Минимум 1')
    expect(wrapper.vm.rules.minOne(1)).toBe(true)
  })

  it('form defaults are correct', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.form.guests_count).toBe(1)
    expect(wrapper.vm.form.unit_id).toBeNull()
  })
})
