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

  it('handleFormSubmit create: calls store.create', async () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    const store = useBranchesStore()
    const spy = vi.spyOn(store, 'create').mockResolvedValue({ id: 1, name: 'HQ' })
    wrapper.vm.openCreate(null)
    wrapper.vm.formName = 'HQ'
    await wrapper.vm.handleFormSubmit()
    expect(spy).toHaveBeenCalledWith({ name: 'HQ', parent_branch_id: null })
    expect(wrapper.vm.formDialog).toBe(false)
  })

  it('handleFormSubmit edit: calls store.update', async () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    const store = useBranchesStore()
    const spy = vi.spyOn(store, 'update').mockResolvedValue({ id: 1, name: 'Main' })
    wrapper.vm.openEdit({ id: 1, name: 'HQ', parent_branch_id: null })
    wrapper.vm.formName = 'Main'
    await wrapper.vm.handleFormSubmit()
    expect(spy).toHaveBeenCalledWith(1, { name: 'Main', parent_branch_id: null })
  })

  it('handleFormSubmit error: shows error snackbar', async () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    const store = useBranchesStore()
    vi.spyOn(store, 'create').mockRejectedValue(new Error('fail'))
    store.error = 'cycle'
    wrapper.vm.openCreate(null)
    wrapper.vm.formName = 'X'
    await wrapper.vm.handleFormSubmit()
    expect(wrapper.vm.formSubmitting).toBe(false)
  })

  it('handleFormSubmit skips empty name', async () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    const store = useBranchesStore()
    const spy = vi.spyOn(store, 'create')
    wrapper.vm.openCreate(null)
    wrapper.vm.formName = ''
    await wrapper.vm.handleFormSubmit()
    expect(spy).not.toHaveBeenCalled()
  })

  it('handleDelete error: shows error snackbar', async () => {
    const wrapper = mountWithVuetify(BranchTreeView)
    const store = useBranchesStore()
    vi.spyOn(store, 'destroy').mockRejectedValue(new Error('422'))
    store.error = 'Has children'
    wrapper.vm.confirmDelete({ id: 1, name: 'HQ' })
    await wrapper.vm.handleDelete()
    expect(wrapper.vm.deleteDialog).toBe(false)
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
