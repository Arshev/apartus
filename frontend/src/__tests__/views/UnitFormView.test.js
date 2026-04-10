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

import { mountWithVuetify, mountWithVuetifyAsync } from '../helpers/mountWithVuetify'
import UnitFormView from '../../views/UnitFormView.vue'
import * as unitsApi from '../../api/units'
import * as unitAmenitiesApi from '../../api/unitAmenities'

const ROUTES = [
  { path: '/properties/:propertyId/units', component: { template: '<div/>' } },
  { path: '/properties/:propertyId/units/new', name: 'UnitNew', component: UnitFormView },
  { path: '/properties/:propertyId/units/:id/edit', name: 'UnitEdit', component: UnitFormView },
]

describe('UnitFormView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('isEdit is false on /new', async () => {
    const wrapper = mountWithVuetify(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/new',
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isEdit).toBe(false)
    expect(wrapper.text()).toContain('Новое помещение')
  })

  it('loadUnit fetches data in edit mode', async () => {
    unitsApi.get.mockResolvedValue({
      id: 1, name: 'R101', unit_type: 'room', capacity: 2, status: 'available',
    })
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/1/edit',
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isEdit).toBe(true)
    await wrapper.vm.loadUnit()
    expect(unitsApi.get).toHaveBeenCalledWith('10', '1')
    expect(wrapper.vm.form.name).toBe('R101')
  })

  it('handleSubmit create: calls store.create and redirects', async () => {
    unitsApi.create.mockResolvedValue({ id: 1, name: 'R1' })
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/new',
    })
    wrapper.vm.form = { name: 'R1', unit_type: 'room', capacity: 2, status: 'available' }
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/properties/10/units')
  })

  it('handleSubmit edit: calls store.update', async () => {
    unitsApi.get.mockResolvedValue({ id: 1, name: 'R1', unit_type: 'room', capacity: 2, status: 'available' })
    unitsApi.update.mockResolvedValue({ id: 1, name: 'R1 Updated' })
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/1/edit',
    })
    await wrapper.vm.$nextTick()
    wrapper.vm.form = { name: 'R1 Updated', unit_type: 'room', capacity: 2, status: 'available' }
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/properties/10/units')
  })

  it('handleSubmit error: sets formError', async () => {
    unitsApi.create.mockRejectedValue({ response: { data: { error: ['Bad'] } } })
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/new',
    })
    wrapper.vm.form = { name: 'X', unit_type: 'room', capacity: 1, status: 'available' }
    await wrapper.vm.handleSubmit()
    expect(wrapper.vm.formError).toBeTruthy()
    expect(wrapper.vm.submitting).toBe(false)
  })

  it('loadUnit error sets formError', async () => {
    unitsApi.get.mockRejectedValue(new Error('404'))
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/1/edit',
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.loadUnit()
    expect(wrapper.vm.formError).toBe('Не удалось загрузить помещение')
  })

  it('validation rules work', () => {
    const wrapper = mountWithVuetify(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/new',
    })
    expect(wrapper.vm.rules.required('')).toBe('Обязательное поле')
    expect(wrapper.vm.rules.required('x')).toBe(true)
    expect(wrapper.vm.rules.capacityRange(0)).toBe('От 1 до 100')
    expect(wrapper.vm.rules.capacityRange(101)).toBe('От 1 до 100')
    expect(wrapper.vm.rules.capacityRange(50)).toBe(true)
  })

  it('loadAmenities fetches all + attached in edit mode', async () => {
    unitsApi.get.mockResolvedValue({ id: 1, name: 'R1', unit_type: 'room', capacity: 2, status: 'available' })
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/1/edit',
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.loadAmenities()
    expect(wrapper.vm.allAmenities).toHaveLength(2)
    expect(wrapper.vm.attachedAmenityIds).toEqual([1])
  })

  it('isAmenityAttached returns true for attached ids', async () => {
    const wrapper = mountWithVuetify(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/new',
    })
    wrapper.vm.attachedAmenityIds = [1, 3]
    expect(wrapper.vm.isAmenityAttached(1)).toBe(true)
    expect(wrapper.vm.isAmenityAttached(2)).toBe(false)
  })

  it('toggleAmenity attaches when not attached', async () => {
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/1/edit',
    })
    wrapper.vm.attachedAmenityIds = []
    await wrapper.vm.toggleAmenity(2)
    expect(unitAmenitiesApi.attach).toHaveBeenCalledWith('1', 2)
    expect(wrapper.vm.attachedAmenityIds).toContain(2)
  })

  it('toggleAmenity detaches when already attached', async () => {
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/1/edit',
    })
    wrapper.vm.attachedAmenityIds = [2]
    await wrapper.vm.toggleAmenity(2)
    expect(unitAmenitiesApi.detach).toHaveBeenCalledWith('1', 2)
    expect(wrapper.vm.attachedAmenityIds).not.toContain(2)
  })

  it('toggleAmenity error sets amenitiesError', async () => {
    unitAmenitiesApi.attach.mockRejectedValueOnce(new Error('fail'))
    const wrapper = await mountWithVuetifyAsync(UnitFormView, {
      routes: ROUTES,
      initialRoute: '/properties/10/units/1/edit',
    })
    wrapper.vm.attachedAmenityIds = []
    await wrapper.vm.toggleAmenity(2)
    expect(wrapper.vm.amenitiesError).toBe('Не удалось обновить удобства')
    expect(wrapper.vm.togglingAmenity).toBeNull()
  })
})
