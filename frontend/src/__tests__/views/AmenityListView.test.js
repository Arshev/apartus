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

  it('confirmDelete + handleDelete calls store.destroy', async () => {
    const wrapper = mountWithVuetify(AmenityListView)
    const store = useAmenitiesStore()
    const spy = vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1, name: 'WiFi' })
    await wrapper.vm.handleDelete()
    expect(spy).toHaveBeenCalledWith(1)
  })
})
