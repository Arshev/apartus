import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/branches', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import BranchTreeView from '../../views/BranchTreeView.vue'
import { useBranchesStore } from '../../stores/branches'

describe('BranchTreeView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('openCreate sets parentId and opens dialog', () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    wrapper.vm.openCreate(5)
    expect(wrapper.vm.formParentId).toBe(5)
    expect(wrapper.vm.editingBranch).toBeNull()
    expect(wrapper.vm.formDialog).toBe(true)
  })

  it('openEdit fills form from branch', () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    wrapper.vm.openEdit({ id: 1, name: 'HQ', parent_branch_id: null })
    expect(wrapper.vm.editingBranch.id).toBe(1)
    expect(wrapper.vm.formName).toBe('HQ')
    expect(wrapper.vm.formParentId).toBeNull()
  })

  it('parentOptions excludes editingBranch', () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    const store = useBranchesStore()
    store.items = [{ id: 1, name: 'HQ' }, { id: 2, name: 'North' }]
    wrapper.vm.openEdit({ id: 1, name: 'HQ', parent_branch_id: null })
    expect(wrapper.vm.parentOptions.map((o) => o.id)).toEqual([2])
  })

  it('confirmDelete + handleDelete calls store.destroy', async () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    const store = useBranchesStore()
    const spy = vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 2, name: 'North' })
    await wrapper.vm.handleDelete()
    expect(spy).toHaveBeenCalledWith(2)
  })
})
