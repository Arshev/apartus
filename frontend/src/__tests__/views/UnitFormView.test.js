import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/units', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import { mountWithVuetify, mountWithVuetifyAsync } from '../helpers/mountWithVuetify'
import UnitFormView from '../../views/UnitFormView.vue'
import * as unitsApi from '../../api/units'

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
})
