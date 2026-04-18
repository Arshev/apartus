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

import { mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import UnitListView from '../../views/UnitListView.vue'
import { useUnitsStore } from '../../stores/units'

const ROUTES = [
  { path: '/properties', component: { template: '<div/>' } },
  { path: '/properties/:propertyId/units', component: UnitListView },
  { path: '/properties/:propertyId/units/new', component: { template: '<div/>' } },
  { path: '/properties/:propertyId/units/:id/edit', component: { template: '<div/>' } },
]

async function mount() {
  return mountWithPrimeVueAsync(UnitListView, {
    routes: ROUTES,
    initialRoute: '/properties/10/units',
  })
}

describe('UnitListView (FT-036 P2)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders add button', async () => {
    const wrapper = await mount()
    expect(wrapper.text()).toContain('Добавить')
  })

  it('typeLabels and statusLabels cover all enums', async () => {
    const wrapper = await mount()
    expect(Object.keys(wrapper.vm.typeLabels)).toEqual(['room', 'apartment', 'bed', 'studio'])
    expect(Object.keys(wrapper.vm.statusLabels)).toEqual(['available', 'maintenance', 'blocked'])
  })

  it('confirmDelete does not throw', async () => {
    const wrapper = await mount()
    expect(() => wrapper.vm.confirmDelete({ id: 1, name: 'R101' })).not.toThrow()
  })

  it('handleDelete invokes API destroy', async () => {
    const unitsApi = await import('../../api/units')
    const wrapper = await mount()
    await wrapper.vm.handleDelete({ id: 42, name: 'X' })
    // Store passes (propertyId, id) to API; assert id present
    expect(unitsApi.destroy).toHaveBeenCalled()
    const args = unitsApi.destroy.mock.calls[0]
    expect(args[args.length - 1]).toBe(42)
  })

  it('handleDelete error does not throw', async () => {
    const unitsApi = await import('../../api/units')
    unitsApi.destroy.mockRejectedValueOnce(new Error('fail'))
    const wrapper = await mount()
    await wrapper.vm.handleDelete({ id: 1, name: 'X' })
  })

  it('fetchAll called on mount with propertyId', async () => {
    await mount()
    const store = useUnitsStore()
    await new Promise((r) => setTimeout(r, 0))
    expect(store.propertyId).toBe('10')
  })
})
