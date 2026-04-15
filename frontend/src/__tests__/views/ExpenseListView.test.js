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

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ExpenseListView from '../../views/ExpenseListView.vue'
import { useExpensesStore } from '../../stores/expenses'

describe('ExpenseListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct headers', () => {
    const wrapper = mountWithVuetify(ExpenseListView)
    expect(wrapper.vm.headers.map((h) => h.key)).toContain('expense_date')
    expect(wrapper.vm.headers.map((h) => h.key)).toContain('category')
    expect(wrapper.vm.headers.map((h) => h.key)).toContain('amount_cents')
  })

  it('openCreate resets form', () => {
    const wrapper = mountWithVuetify(ExpenseListView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editing).toBeNull()
    expect(wrapper.vm.form.category).toBe('other')
  })

  it('openEdit fills form with rub conversion', () => {
    const wrapper = mountWithVuetify(ExpenseListView)
    wrapper.vm.openEdit({ id: 1, category: 'cleaning', amount_cents: 5000, expense_date: '2026-04-01', description: 'test' })
    expect(wrapper.vm.editing.id).toBe(1)
    expect(wrapper.vm.form.amount_rub).toBe(50)
  })

  it('categoryLabel covers all enums', () => {
    const wrapper = mountWithVuetify(ExpenseListView)
    expect(wrapper.vm.categoryLabel('maintenance')).toBe('Обслуживание')
    expect(wrapper.vm.categoryLabel('utilities')).toBe('Коммунальные')
    expect(wrapper.vm.categoryLabel('cleaning')).toBe('Уборка')
    expect(wrapper.vm.categoryLabel('supplies')).toBe('Расходники')
    expect(wrapper.vm.categoryLabel('other')).toBe('Прочее')
  })

  it('confirmDelete + handleDelete', async () => {
    const wrapper = mountWithVuetify(ExpenseListView)
    const store = useExpensesStore()
    vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1 })
    await wrapper.vm.handleDelete()
    expect(store.destroy).toHaveBeenCalledWith(1)
  })
})
