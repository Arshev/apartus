import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/units', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(),
  destroy: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../api/properties', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import { mountWithVuetify, mountWithVuetifyAsync } from '../helpers/mountWithVuetify'
import UnitListView from '../../views/UnitListView.vue'
import { useUnitsStore } from '../../stores/units'

const ROUTES = [
  { path: '/properties', component: { template: '<div/>' } },
  { path: '/properties/:propertyId/units', component: UnitListView },
  { path: '/properties/:propertyId/units/new', component: { template: '<div/>' } },
  { path: '/properties/:propertyId/units/:id/edit', component: { template: '<div/>' } },
]

describe('UnitListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct headers', () => {
    const wrapper = mountWithVuetify(UnitListView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units',
    })
    expect(wrapper.vm.headers.map((h) => h.key)).toEqual(['name', 'unit_type', 'capacity', 'status', 'actions'])
  })

  it('renders «Добавить» button', () => {
    const wrapper = mountWithVuetify(UnitListView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units',
    })
    expect(wrapper.text()).toContain('Добавить')
  })

  it('confirmDelete + handleDelete calls store.destroy', async () => {
    const wrapper = mountWithVuetify(UnitListView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units',
    })
    const store = useUnitsStore()
    const spy = vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1, name: 'R101' })
    await wrapper.vm.handleDelete()
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('handleDelete error: closes dialog', async () => {
    const wrapper = mountWithVuetify(UnitListView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units',
    })
    const store = useUnitsStore()
    vi.spyOn(store, 'destroy').mockRejectedValue(new Error('404'))
    store.error = 'Not found'
    wrapper.vm.confirmDelete({ id: 1, name: 'R101' })
    await wrapper.vm.handleDelete()
    expect(wrapper.vm.deleteDialog).toBe(false)
  })

  it('calls store.fetchAll on mount when propertyId present', async () => {
    const wrapper = await mountWithVuetifyAsync(UnitListView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units',
    })
    const store = useUnitsStore()
    // onMounted fires with propertyId=10, fetchAll called
    await wrapper.vm.$nextTick()
    // onMounted called fetchAll('10') which sets propertyId
    expect(store.propertyId).toBe('10')
  })

  it('typeLabels and statusLabels cover all enums', () => {
    const wrapper = mountWithVuetify(UnitListView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units',
    })
    expect(Object.keys(wrapper.vm.typeLabels)).toEqual(['room', 'apartment', 'bed', 'studio'])
    expect(Object.keys(wrapper.vm.statusLabels)).toEqual(['available', 'maintenance', 'blocked'])
  })
})
