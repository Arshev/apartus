import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/amenities', () => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn(), update: vi.fn(), destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import AmenityListView from '../../views/AmenityListView.vue'

describe('AmenityListView (FT-036 P2)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('openCreate resets form + opens dialog', () => {
    const wrapper = mountWithPrimeVue(AmenityListView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editingAmenity).toBeNull()
    expect(wrapper.vm.formName).toBe('')
    expect(wrapper.vm.formDialog).toBe(true)
  })

  it('openEdit fills form', () => {
    const wrapper = mountWithPrimeVue(AmenityListView)
    wrapper.vm.openEdit({ id: 1, name: 'WiFi' })
    expect(wrapper.vm.editingAmenity).toEqual({ id: 1, name: 'WiFi' })
    expect(wrapper.vm.formName).toBe('WiFi')
    expect(wrapper.vm.formDialog).toBe(true)
  })

  it('handleFormSubmit create invokes API create', async () => {
    const amenitiesApi = await import('../../api/amenities')
    amenitiesApi.create.mockResolvedValue({ id: 1, name: 'WiFi' })
    const wrapper = mountWithPrimeVue(AmenityListView)
    wrapper.vm.openCreate()
    wrapper.vm.formName = 'WiFi'
    await wrapper.vm.handleFormSubmit()
    expect(amenitiesApi.create).toHaveBeenCalledWith({ name: 'WiFi' })
    expect(wrapper.vm.formDialog).toBe(false)
  })

  it('handleFormSubmit edit invokes API update', async () => {
    const amenitiesApi = await import('../../api/amenities')
    amenitiesApi.update.mockResolvedValue({ id: 1, name: 'Fast WiFi' })
    const wrapper = mountWithPrimeVue(AmenityListView)
    wrapper.vm.openEdit({ id: 1, name: 'WiFi' })
    wrapper.vm.formName = 'Fast WiFi'
    await wrapper.vm.handleFormSubmit()
    expect(amenitiesApi.update).toHaveBeenCalledWith(1, { name: 'Fast WiFi' })
    expect(wrapper.vm.formDialog).toBe(false)
  })

  it('handleFormSubmit empty name → formError, no API call', async () => {
    const amenitiesApi = await import('../../api/amenities')
    const wrapper = mountWithPrimeVue(AmenityListView)
    wrapper.vm.openCreate()
    wrapper.vm.formName = '  '
    await wrapper.vm.handleFormSubmit()
    expect(amenitiesApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.formError).toBe('common.validation.required')
  })

  it('handleFormSubmit error path', async () => {
    const amenitiesApi = await import('../../api/amenities')
    amenitiesApi.create.mockRejectedValue(new Error('fail'))
    const wrapper = mountWithPrimeVue(AmenityListView)
    wrapper.vm.openCreate()
    wrapper.vm.formName = 'X'
    await wrapper.vm.handleFormSubmit()
    expect(wrapper.vm.formSubmitting).toBe(false)
  })

  it('confirmDelete does not throw', () => {
    const wrapper = mountWithPrimeVue(AmenityListView)
    expect(() => wrapper.vm.confirmDelete({ id: 1, name: 'WiFi' })).not.toThrow()
  })

  it('handleDelete invokes API destroy', async () => {
    const amenitiesApi = await import('../../api/amenities')
    const wrapper = mountWithPrimeVue(AmenityListView)
    await wrapper.vm.handleDelete({ id: 42, name: 'X' })
    expect(amenitiesApi.destroy).toHaveBeenCalledWith(42)
  })
})
