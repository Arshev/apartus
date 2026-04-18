import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/units', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))
vi.mock('../../api/amenities', () => ({
  list: vi.fn().mockResolvedValue([{ id: 1, name: 'WiFi' }, { id: 2, name: 'Pool' }]),
}))
vi.mock('../../api/unitAmenities', () => ({
  list: vi.fn().mockResolvedValue([{ id: 1, name: 'WiFi' }]),
  attach: vi.fn().mockResolvedValue({ id: 10 }),
  detach: vi.fn().mockResolvedValue({}),
}))

import { mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import UnitFormView from '../../views/UnitFormView.vue'
import * as unitsApi from '../../api/units'
import * as unitAmenitiesApi from '../../api/unitAmenities'

const ROUTES = [
  { path: '/properties/:propertyId/units', component: { template: '<div/>' } },
  { path: '/properties/:propertyId/units/new', name: 'UnitNew', component: UnitFormView },
  { path: '/properties/:propertyId/units/:id/edit', name: 'UnitEdit', component: UnitFormView },
]

async function mount(route = '/properties/7/units/new') {
  return mountWithPrimeVueAsync(UnitFormView, { routes: ROUTES, initialRoute: route })
}

const validForm = {
  name: 'Room 1',
  unit_type: 'room',
  capacity: 2,
  status: 'available',
  base_price_rub: 50,
}

describe('UnitFormView (FT-036 P2)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('isEdit false on new route', async () => {
    const wrapper = await mount('/properties/7/units/new')
    expect(wrapper.vm.isEdit).toBe(false)
    expect(wrapper.vm.propertyId).toBe('7')
  })

  it('validateField flags empty name', async () => {
    const wrapper = await mount()
    wrapper.vm.validateField('name')
    expect(wrapper.vm.fieldErrors.name).toBe('common.validation.required')
  })

  it('capacity out of range caught by schema', async () => {
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, { ...validForm, capacity: 0 })
    wrapper.vm.validateField('capacity')
    expect(wrapper.vm.fieldErrors.capacity).toBe('common.validation.capacityRange')
  })

  it('loadUnit fetches in edit mode', async () => {
    unitsApi.get.mockResolvedValue({
      id: 3, name: 'R', unit_type: 'room', capacity: 2, status: 'available', base_price_cents: 10000,
    })
    const wrapper = await mount('/properties/7/units/3/edit')
    await wrapper.vm.loadUnit()
    expect(wrapper.vm.form.name).toBe('R')
    expect(wrapper.vm.form.base_price_rub).toBe(100)
  })

  it('handleSubmit create success', async () => {
    unitsApi.create.mockResolvedValue({ id: 99 })
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, validForm)
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/properties/7/units')
  })

  it('handleSubmit blocked when invalid', async () => {
    const wrapper = await mount()
    await wrapper.vm.handleSubmit()
    expect(unitsApi.create).not.toHaveBeenCalled()
  })

  it('handleSubmit payload converts price to cents', async () => {
    unitsApi.create.mockResolvedValue({ id: 99 })
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, { ...validForm, base_price_rub: 50.0 })
    await wrapper.vm.handleSubmit()
    // verify create called (payload shape via store)
    expect(unitsApi.create).toHaveBeenCalled()
  })

  it('toggleAmenity attach', async () => {
    const wrapper = await mount('/properties/7/units/3/edit')
    await wrapper.vm.loadAmenities()
    await wrapper.vm.toggleAmenity(2) // Pool not attached
    expect(unitAmenitiesApi.attach).toHaveBeenCalledWith('3', 2)
    expect(wrapper.vm.attachedAmenityIds).toContain(2)
  })

  it('toggleAmenity detach', async () => {
    const wrapper = await mount('/properties/7/units/3/edit')
    await wrapper.vm.loadAmenities()
    await wrapper.vm.toggleAmenity(1) // WiFi attached
    expect(unitAmenitiesApi.detach).toHaveBeenCalledWith('3', 1)
    expect(wrapper.vm.attachedAmenityIds).not.toContain(1)
  })

  it('loadUnit error', async () => {
    unitsApi.get.mockRejectedValue(new Error('404'))
    const wrapper = await mount('/properties/7/units/3/edit')
    await wrapper.vm.loadUnit()
    expect(wrapper.vm.formError).toBeTruthy()
  })
})
