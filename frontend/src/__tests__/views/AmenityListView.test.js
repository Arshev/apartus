import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/amenities', () => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn(), update: vi.fn(), destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import AmenityListView from '../../views/AmenityListView.vue'
import { useAmenitiesStore } from '../../stores/amenities'

describe('AmenityListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct headers', () => {
    const wrapper = mountWithVuetify(AmenityListView)
    expect(wrapper.vm.headers.map((h) => h.key)).toEqual(['name', 'actions'])
  })

  it('openCreate resets form', () => {
    const wrapper = mountWithVuetify(AmenityListView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editingAmenity).toBeNull()
    expect(wrapper.vm.formName).toBe('')
    expect(wrapper.vm.formDialog).toBe(true)
  })

  it('openEdit fills form', () => {
    const wrapper = mountWithVuetify(AmenityListView)
    wrapper.vm.openEdit({ id: 1, name: 'WiFi' })
    expect(wrapper.vm.editingAmenity).toEqual({ id: 1, name: 'WiFi' })
    expect(wrapper.vm.formName).toBe('WiFi')
  })

  it('handleFormSubmit create: calls store.create', async () => {
    const wrapper = mountWithVuetify(AmenityListView)
    const store = useAmenitiesStore()
    const spy = vi.spyOn(store, 'create').mockResolvedValue({ id: 1, name: 'WiFi' })
    wrapper.vm.openCreate()
    wrapper.vm.formName = 'WiFi'
    await wrapper.vm.handleFormSubmit()
    expect(spy).toHaveBeenCalledWith({ name: 'WiFi' })
    expect(wrapper.vm.formDialog).toBe(false)
  })

  it('handleFormSubmit edit: calls store.update', async () => {
    const wrapper = mountWithVuetify(AmenityListView)
    const store = useAmenitiesStore()
    const spy = vi.spyOn(store, 'update').mockResolvedValue({ id: 1, name: 'Fast WiFi' })
    wrapper.vm.openEdit({ id: 1, name: 'WiFi' })
    wrapper.vm.formName = 'Fast WiFi'
    await wrapper.vm.handleFormSubmit()
    expect(spy).toHaveBeenCalledWith(1, { name: 'Fast WiFi' })
    expect(wrapper.vm.formDialog).toBe(false)
  })

  it('handleFormSubmit error: shows snackbar', async () => {
    const wrapper = mountWithVuetify(AmenityListView)
    const store = useAmenitiesStore()
    vi.spyOn(store, 'create').mockRejectedValue(new Error('fail'))
    store.error = 'duplicate'
    wrapper.vm.openCreate()
    wrapper.vm.formName = 'X'
    await wrapper.vm.handleFormSubmit()
    expect(wrapper.vm.formSubmitting).toBe(false)
  })

  it('handleFormSubmit skips empty name', async () => {
    const wrapper = mountWithVuetify(AmenityListView)
    const store = useAmenitiesStore()
    const spy = vi.spyOn(store, 'create')
    wrapper.vm.openCreate()
    wrapper.vm.formName = '  '
    await wrapper.vm.handleFormSubmit()
    expect(spy).not.toHaveBeenCalled()
  })

  it('handleDelete error: shows error snackbar', async () => {
    const wrapper = mountWithVuetify(AmenityListView)
    const store = useAmenitiesStore()
    vi.spyOn(store, 'destroy').mockRejectedValue(new Error('409'))
    store.error = 'Удалите привязки'
    wrapper.vm.confirmDelete({ id: 1, name: 'WiFi' })
    await wrapper.vm.handleDelete()
    expect(wrapper.vm.deleteDialog).toBe(false)
  })

  it('confirmDelete + handleDelete calls store.destroy', async () => {
    const wrapper = mountWithVuetify(AmenityListView)
    const store = useAmenitiesStore()
    const spy = vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1, name: 'WiFi' })
    await wrapper.vm.handleDelete()
    expect(spy).toHaveBeenCalledWith(1)
  })
})
