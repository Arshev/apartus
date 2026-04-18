import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', () => ({ signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getCurrentUser: vi.fn() }))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(), removeAuthTokens: vi.fn(),
  getAuthToken: vi.fn().mockReturnValue('t'),
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../api/expenses', () => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({ id: 1 }),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import ExpenseListView from '../../views/ExpenseListView.vue'

describe('ExpenseListView (FT-036 P4)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('openCreate resets form', () => {
    const wrapper = mountWithPrimeVue(ExpenseListView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editing).toBeNull()
    expect(wrapper.vm.form.category).toBe('other')
  })

  it('openEdit fills form with rub conversion', () => {
    const wrapper = mountWithPrimeVue(ExpenseListView)
    wrapper.vm.openEdit({
      id: 1, category: 'cleaning', amount_cents: 5000,
      expense_date: '2026-04-01', description: 'test',
    })
    expect(wrapper.vm.editing.id).toBe(1)
    expect(wrapper.vm.form.amount_rub).toBe(50)
  })

  it('categoryLabel covers all enums', () => {
    const wrapper = mountWithPrimeVue(ExpenseListView)
    expect(wrapper.vm.categoryLabel('maintenance')).toBe('Обслуживание')
    expect(wrapper.vm.categoryLabel('utilities')).toBe('Коммунальные')
    expect(wrapper.vm.categoryLabel('cleaning')).toBe('Уборка')
    expect(wrapper.vm.categoryLabel('supplies')).toBe('Расходники')
    expect(wrapper.vm.categoryLabel('other')).toBe('Прочее')
  })

  it('confirmDelete does not throw', () => {
    const wrapper = mountWithPrimeVue(ExpenseListView)
    expect(() => wrapper.vm.confirmDelete({ id: 1, category: 'other' })).not.toThrow()
  })

  it('handleDelete invokes API destroy', async () => {
    const expensesApi = await import('../../api/expenses')
    const wrapper = mountWithPrimeVue(ExpenseListView)
    await wrapper.vm.handleDelete({ id: 42 })
    expect(expensesApi.destroy).toHaveBeenCalledWith(42)
  })

  it('handleSubmit validates and converts rub→cents', async () => {
    const expensesApi = await import('../../api/expenses')
    const wrapper = mountWithPrimeVue(ExpenseListView)
    wrapper.vm.openCreate()
    wrapper.vm.form.amount_rub = 50
    await wrapper.vm.handleSubmit()
    expect(expensesApi.create).toHaveBeenCalled()
    const payload = expensesApi.create.mock.calls[0][0]
    expect(payload.amount_cents).toBe(5000)
    expect(payload).not.toHaveProperty('amount_rub')
  })

  it('handleSubmit blocked on invalid (empty date)', async () => {
    const expensesApi = await import('../../api/expenses')
    const wrapper = mountWithPrimeVue(ExpenseListView)
    wrapper.vm.openCreate()
    wrapper.vm.form.expense_date = ''
    await wrapper.vm.handleSubmit()
    expect(expensesApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.fieldErrors.expense_date).toBeTruthy()
  })
})
