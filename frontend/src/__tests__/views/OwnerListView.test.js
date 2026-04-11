import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/owners', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({ id: 1 }),
  destroy: vi.fn().mockResolvedValue({}), statement: vi.fn(),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import OwnerListView from '../../views/OwnerListView.vue'
import { useOwnersStore } from '../../stores/owners'

describe('OwnerListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct headers', () => {
    const wrapper = mountWithVuetify(OwnerListView)
    expect(wrapper.vm.headers.map((h) => h.key)).toContain('name')
    expect(wrapper.vm.headers.map((h) => h.key)).toContain('commission_rate')
  })

  it('openCreate resets form', () => {
    const wrapper = mountWithVuetify(OwnerListView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editing).toBeNull()
    expect(wrapper.vm.form.commission_pct).toBe(0)
  })

  it('openEdit converts commission_rate to pct', () => {
    const wrapper = mountWithVuetify(OwnerListView)
    wrapper.vm.openEdit({ id: 1, name: 'A', commission_rate: 1500 })
    expect(wrapper.vm.form.commission_pct).toBe(15)
  })

  it('confirmDelete + handleDelete', async () => {
    const wrapper = mountWithVuetify(OwnerListView)
    const store = useOwnersStore()
    vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1 })
    await wrapper.vm.handleDelete()
    expect(store.destroy).toHaveBeenCalledWith(1)
  })
})
