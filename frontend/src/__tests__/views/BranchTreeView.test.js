import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/branches', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import BranchTreeView from '../../views/BranchTreeView.vue'
import { useBranchesStore } from '../../stores/branches'

describe('BranchTreeView (FT-036 P2)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('openCreate sets parentId and opens dialog', () => {
    const wrapper = mountWithPrimeVue(BranchTreeView)
    wrapper.vm.openCreate(5)
    expect(wrapper.vm.formParentId).toBe(5)
    expect(wrapper.vm.editingBranch).toBeNull()
    expect(wrapper.vm.formDialog).toBe(true)
  })

  it('openEdit fills form from branch', () => {
    const wrapper = mountWithPrimeVue(BranchTreeView)
    wrapper.vm.openEdit({ id: 1, name: 'HQ', parent_branch_id: null })
    expect(wrapper.vm.editingBranch.id).toBe(1)
    expect(wrapper.vm.formName).toBe('HQ')
    expect(wrapper.vm.formParentId).toBeNull()
  })

  it('parentOptions excludes editingBranch', () => {
    const wrapper = mountWithPrimeVue(BranchTreeView)
    const store = useBranchesStore()
    store.items = [{ id: 1, name: 'HQ' }, { id: 2, name: 'North' }]
    wrapper.vm.openEdit({ id: 1, name: 'HQ', parent_branch_id: null })
    expect(wrapper.vm.parentOptions.map((o) => o.id)).toEqual([2])
  })

  it('handleFormSubmit create invokes API create', async () => {
    const branchesApi = await import('../../api/branches')
    branchesApi.create.mockResolvedValue({ id: 1, name: 'HQ' })
    const wrapper = mountWithPrimeVue(BranchTreeView)
    wrapper.vm.openCreate(null)
    wrapper.vm.formName = 'HQ'
    await wrapper.vm.handleFormSubmit()
    expect(branchesApi.create).toHaveBeenCalled()
    expect(wrapper.vm.formDialog).toBe(false)
  })

  it('handleFormSubmit edit invokes API update', async () => {
    const branchesApi = await import('../../api/branches')
    branchesApi.update.mockResolvedValue({ id: 1, name: 'Main' })
    const wrapper = mountWithPrimeVue(BranchTreeView)
    wrapper.vm.openEdit({ id: 1, name: 'HQ', parent_branch_id: null })
    wrapper.vm.formName = 'Main'
    await wrapper.vm.handleFormSubmit()
    expect(branchesApi.update).toHaveBeenCalled()
  })

  it('handleFormSubmit skips empty name (formError set)', async () => {
    const branchesApi = await import('../../api/branches')
    const wrapper = mountWithPrimeVue(BranchTreeView)
    wrapper.vm.openCreate(null)
    wrapper.vm.formName = ''
    await wrapper.vm.handleFormSubmit()
    expect(branchesApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.formError).toBe('common.validation.required')
  })

  it('handleFormSubmit error path', async () => {
    const branchesApi = await import('../../api/branches')
    branchesApi.create.mockRejectedValue(new Error('fail'))
    const wrapper = mountWithPrimeVue(BranchTreeView)
    wrapper.vm.openCreate(null)
    wrapper.vm.formName = 'X'
    await wrapper.vm.handleFormSubmit()
    expect(wrapper.vm.formSubmitting).toBe(false)
  })

  it('confirmDelete wires to useConfirm', () => {
    const wrapper = mountWithPrimeVue(BranchTreeView)
    expect(() => wrapper.vm.confirmDelete({ id: 1, name: 'HQ' })).not.toThrow()
  })

  it('handleDelete invokes API destroy', async () => {
    const branchesApi = await import('../../api/branches')
    const wrapper = mountWithPrimeVue(BranchTreeView)
    await wrapper.vm.handleDelete({ id: 42, name: 'HQ' })
    expect(branchesApi.destroy).toHaveBeenCalledWith(42)
  })
})
