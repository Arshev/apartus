import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue('t'),
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../api/owners', () => ({
  statement: vi.fn().mockResolvedValue({
    owner_name: 'Alice',
    commission_rate: 1500,
    total_revenue: 100000,
    total_expenses: 10000,
    commission: 15000,
    net_payout: 75000,
    properties: [{ property_name: 'Hotel A', revenue: 100000, expenses: 10000, commission: 15000, payout: 75000 }],
  }),
}))
vi.mock('../../api/pdfExport', () => ({
  downloadOwnerStatement: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../utils/currency', () => ({
  formatMoney: vi.fn((cents) => `${(cents / 100).toFixed(0)} ₽`),
}))

import { mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import OwnerStatementView from '../../views/OwnerStatementView.vue'
import * as ownersApi from '../../api/owners'
import { downloadOwnerStatement } from '../../api/pdfExport'

describe('OwnerStatementView (FT-036 P4)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function mount() {
    return mountWithPrimeVueAsync(OwnerStatementView, {
      routes: [
        { path: '/owners/:id/statement', component: OwnerStatementView },
        { path: '/owners', component: { template: '<div/>' } },
      ],
      initialRoute: '/owners/1/statement',
    })
  }

  it('loads statement on mount', async () => {
    await mount()
    await new Promise((r) => setTimeout(r, 0))
    expect(ownersApi.statement).toHaveBeenCalledWith('1')
  })

  it('fmt formats money', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.fmt(10000)).toContain('100')
  })

  it('sets error on load failure', async () => {
    ownersApi.statement.mockRejectedValue(new Error('fail'))
    const wrapper = await mount()
    await wrapper.vm.loadStatement()
    expect(wrapper.vm.error).toBe('Не удалось загрузить отчёт')
  })

  it('downloadPdf calls pdfExport', async () => {
    const wrapper = await mount()
    await wrapper.vm.downloadPdf()
    expect(downloadOwnerStatement).toHaveBeenCalledWith('1')
    expect(wrapper.vm.downloading).toBe(false)
  })
})
