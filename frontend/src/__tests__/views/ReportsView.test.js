import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', () => ({ signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getCurrentUser: vi.fn() }))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(), removeAuthTokens: vi.fn(),
  getAuthToken: vi.fn().mockReturnValue('t'),
  default: { get: vi.fn() },
}))
vi.mock('../../api/reports', () => ({
  financial: vi.fn().mockResolvedValue({
    total_revenue: 100000, total_expenses: 30000, net_income: 70000,
    occupancy_rate: 0.65, adr: 5000, revpar: 3250,
    revenue_by_property: [{ property_name: 'A', revenue: 60000 }],
    expenses_by_category: [{ category: 'cleaning', total: 10000 }],
    total_room_nights: 120, occupied_nights: 78,
  }),
}))
vi.mock('../../api/pdfExport', () => ({
  downloadFinancialReport: vi.fn().mockResolvedValue(undefined),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import ReportsView from '../../views/ReportsView.vue'
import { useAuthStore } from '../../stores/auth'

describe('ReportsView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders report title', () => {
    const wrapper = mountWithPrimeVue(ReportsView)
    expect(wrapper.text()).toContain('Финансовый отчёт')
  })

  it('loadReport populates data', async () => {
    const wrapper = mountWithPrimeVue(ReportsView)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.data).toBeTruthy()
    expect(wrapper.vm.data.total_revenue).toBe(100000)
  })

  it('expenseCategoryLabel covers all', () => {
    const wrapper = mountWithPrimeVue(ReportsView)
    expect(wrapper.vm.expenseCategoryLabel('cleaning')).toBe('Уборка')
    expect(wrapper.vm.expenseCategoryLabel('maintenance')).toBe('Обслуживание')
  })
})
