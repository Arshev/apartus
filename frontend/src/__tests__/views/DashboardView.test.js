import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue('t'),
  default: { get: vi.fn() },
}))
vi.mock('../../api/dashboard', () => ({
  get: vi.fn().mockResolvedValue({
    total_units: 10,
    occupied_units: 4,
    occupancy_rate: 0.4,
    revenue_this_month: 50000,
    upcoming_check_ins: [{ id: 1, unit_name: 'R1', guest_name: 'Ivan', check_in: '2026-04-15', status: 'confirmed' }],
    upcoming_check_outs: [],
    reservations_by_status: { confirmed: 5, checked_in: 2, checked_out: 1, cancelled: 0 },
  }),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import DashboardView from '../../views/DashboardView.vue'
import { useAuthStore } from '../../stores/auth'

describe('DashboardView', () => {
  it('renders greeting', async () => {
    const wrapper = mountWithVuetify(DashboardView)
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Иван Иванов' }
    store.organization = { id: 1, name: 'Тест Орг' }
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Здравствуйте, Иван Иванов')
    expect(wrapper.text()).toContain('Тест Орг')
  })

  it('loadDashboard populates data', async () => {
    const wrapper = mountWithVuetify(DashboardView)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.data).toBeTruthy()
    expect(wrapper.vm.data.total_units).toBe(10)
    expect(wrapper.vm.data.occupancy_rate).toBe(0.4)
  })

  it('formatPrice formats cents to currency', () => {
    const wrapper = mountWithVuetify(DashboardView)
    const store = useAuthStore()
    store.organization = { id: 1, name: 'Test', currency: 'RUB' }
    expect(wrapper.vm.formatPrice(50000)).toBe('500.00 ₽')
    expect(wrapper.vm.formatPrice(0)).toBe('0.00 ₽')
  })

  it('loadDashboard error sets error', async () => {
    const { get } = await import('../../api/dashboard')
    get.mockRejectedValueOnce(new Error('network'))
    const wrapper = mountWithVuetify(DashboardView)
    await wrapper.vm.loadDashboard()
    expect(wrapper.vm.error).toBe('Не удалось загрузить данные')
  })
})
