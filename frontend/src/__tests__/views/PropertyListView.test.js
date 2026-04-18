import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/properties', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import PropertyListView from '../../views/PropertyListView.vue'

const ROUTES = [
  { path: '/properties', component: PropertyListView },
  { path: '/properties/new', component: { template: '<div/>' } },
  { path: '/properties/:id/edit', component: { template: '<div/>' } },
]

describe('PropertyListView (FT-036 P2)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders title + add button', () => {
    const wrapper = mountWithPrimeVue(PropertyListView, { routes: ROUTES })
    expect(wrapper.text()).toContain('Объекты')
    expect(wrapper.text()).toContain('Добавить объект')
  })

  it('typeLabels maps all backend enum values', () => {
    const wrapper = mountWithPrimeVue(PropertyListView, { routes: ROUTES })
    expect(Object.keys(wrapper.vm.typeLabels)).toEqual(['apartment', 'hotel', 'house', 'hostel'])
  })

  it('confirmDelete wires to useConfirm without throwing', () => {
    const wrapper = mountWithPrimeVue(PropertyListView, { routes: ROUTES })
    expect(() => wrapper.vm.confirmDelete({ id: 1, name: 'Test' })).not.toThrow()
  })

  it('handleDelete invokes API destroy', async () => {
    const propertiesApi = await import('../../api/properties')
    const wrapper = mountWithPrimeVue(PropertyListView, { routes: ROUTES })
    await wrapper.vm.handleDelete({ id: 42, name: 'X' })
    expect(propertiesApi.destroy).toHaveBeenCalledWith(42)
  })

  it('handleDelete error path does not throw', async () => {
    const propertiesApi = await import('../../api/properties')
    propertiesApi.destroy.mockRejectedValueOnce(new Error('fail'))
    const wrapper = mountWithPrimeVue(PropertyListView, { routes: ROUTES })
    await wrapper.vm.handleDelete({ id: 1, name: 'X' })
  })
})
