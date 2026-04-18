import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/owners', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({ id: 1 }),
  destroy: vi.fn().mockResolvedValue({}),
  statement: vi.fn(),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import OwnerListView from '../../views/OwnerListView.vue'

describe('OwnerListView (FT-036 P4)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('openCreate resets form', () => {
    const wrapper = mountWithPrimeVue(OwnerListView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editing).toBeNull()
    expect(wrapper.vm.form.name).toBe('')
    expect(wrapper.vm.form.commission_pct).toBe(0)
  })

  it('openEdit converts commission_rate (bps) to pct', () => {
    const wrapper = mountWithPrimeVue(OwnerListView)
    wrapper.vm.openEdit({
      id: 1, name: 'John', email: 'j@e.com', phone: '123', commission_rate: 1500, notes: 'vip',
    })
    expect(wrapper.vm.editing.id).toBe(1)
    expect(wrapper.vm.form.commission_pct).toBe(15)
  })

  it('confirmDelete does not throw', () => {
    const wrapper = mountWithPrimeVue(OwnerListView)
    expect(() => wrapper.vm.confirmDelete({ id: 1, name: 'X' })).not.toThrow()
  })

  it('handleDelete invokes API destroy', async () => {
    const ownersApi = await import('../../api/owners')
    const wrapper = mountWithPrimeVue(OwnerListView)
    await wrapper.vm.handleDelete({ id: 42, name: 'X' })
    expect(ownersApi.destroy).toHaveBeenCalledWith(42)
  })

  it('handleSubmit converts pct→commission_rate basis points', async () => {
    const ownersApi = await import('../../api/owners')
    const wrapper = mountWithPrimeVue(OwnerListView)
    wrapper.vm.openCreate()
    wrapper.vm.form.name = 'Owner'
    wrapper.vm.form.commission_pct = 10
    await wrapper.vm.handleSubmit()
    expect(ownersApi.create).toHaveBeenCalled()
    const payload = ownersApi.create.mock.calls[0][0]
    expect(payload.commission_rate).toBe(1000)
  })

  it('handleSubmit blocked on empty name', async () => {
    const ownersApi = await import('../../api/owners')
    const wrapper = mountWithPrimeVue(OwnerListView)
    wrapper.vm.openCreate()
    await wrapper.vm.handleSubmit()
    expect(ownersApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.fieldErrors.name).toBeTruthy()
  })

  it('handleSubmit rejects invalid email', async () => {
    const ownersApi = await import('../../api/owners')
    const wrapper = mountWithPrimeVue(OwnerListView)
    wrapper.vm.openCreate()
    wrapper.vm.form.name = 'Owner'
    wrapper.vm.form.email = 'not-an-email'
    await wrapper.vm.handleSubmit()
    expect(ownersApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.fieldErrors.email).toBe('common.validation.invalidEmail')
  })
})
