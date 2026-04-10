import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/properties', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import PropertyListView from '../../views/PropertyListView.vue'
import { usePropertiesStore } from '../../stores/properties'

const ROUTES = [
  { path: '/properties', component: PropertyListView },
  { path: '/properties/new', component: { template: '<div/>' } },
  { path: '/properties/:id/edit', component: { template: '<div/>' } },
]

describe('PropertyListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('exposes correct table headers', () => {
    const wrapper = mountWithVuetify(PropertyListView, { routes: ROUTES })
    expect(wrapper.vm.headers.map((h) => h.key)).toEqual(['name', 'address', 'property_type', 'actions'])
  })

  it('renders «Добавить объект» button', () => {
    const wrapper = mountWithVuetify(PropertyListView, { routes: ROUTES })
    expect(wrapper.text()).toContain('Добавить объект')
  })

  it('typeLabels maps all backend enum values', () => {
    const wrapper = mountWithVuetify(PropertyListView, { routes: ROUTES })
    expect(Object.keys(wrapper.vm.typeLabels)).toEqual(['apartment', 'hotel', 'house', 'hostel'])
  })

  it('confirmDelete sets deletingProperty and opens dialog', () => {
    const wrapper = mountWithVuetify(PropertyListView, { routes: ROUTES })
    wrapper.vm.confirmDelete({ id: 1, name: 'Test' })
    expect(wrapper.vm.deletingProperty).toEqual({ id: 1, name: 'Test' })
  })

  it('handleDelete calls store.destroy and shows snackbar (SC-04)', async () => {
    const wrapper = mountWithVuetify(PropertyListView, { routes: ROUTES })
    const store = usePropertiesStore()
    const spy = vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1, name: 'Test' })
    await wrapper.vm.handleDelete()
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('handleDelete error: closes dialog and shows error', async () => {
    const wrapper = mountWithVuetify(PropertyListView, { routes: ROUTES })
    const store = usePropertiesStore()
    vi.spyOn(store, 'destroy').mockRejectedValue(new Error('404'))
    store.error = 'Not found'
    wrapper.vm.confirmDelete({ id: 1, name: 'Test' })
    await wrapper.vm.handleDelete()
    expect(wrapper.vm.deleteDialog).toBe(false)
    expect(wrapper.vm.deletingProperty).toBeNull()
  })
})
