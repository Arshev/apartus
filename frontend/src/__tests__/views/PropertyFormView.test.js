import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/properties', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))
vi.mock('../../api/branches', () => ({
  list: vi.fn().mockResolvedValue([{ id: 1, name: 'HQ' }]),
}))

import { mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import PropertyFormView from '../../views/PropertyFormView.vue'
import * as propertiesApi from '../../api/properties'
import * as branchesApi from '../../api/branches'

const ROUTES = [
  { path: '/properties', component: { template: '<div/>' } },
  { path: '/properties/new', name: 'PropertyNew', component: PropertyFormView },
  { path: '/properties/:id/edit', name: 'PropertyEdit', component: PropertyFormView },
]

async function mount(route = '/properties/new') {
  return mountWithPrimeVueAsync(PropertyFormView, { routes: ROUTES, initialRoute: route })
}

const validForm = {
  name: 'Villa A',
  address: '10 St',
  property_type: 'hotel',
  description: '',
  branch_id: null,
}

describe('PropertyFormView (FT-036 P2)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders create mode', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.isEdit).toBe(false)
    expect(wrapper.text()).toContain('Новый объект')
  })

  it('loads branches on mount', async () => {
    await mount()
    await new Promise((r) => setTimeout(r, 0))
    expect(branchesApi.list).toHaveBeenCalled()
  })

  it('isEdit true on :id route, loadProperty fetches', async () => {
    propertiesApi.get.mockResolvedValue({
      id: 5, name: 'My Apt', address: '10 St', property_type: 'apartment', description: '', branch_id: null,
    })
    const wrapper = await mount('/properties/5/edit')
    expect(wrapper.vm.isEdit).toBe(true)
    await wrapper.vm.loadProperty()
    expect(wrapper.vm.form.name).toBe('My Apt')
  })

  it('branchesError on branch fetch failure', async () => {
    branchesApi.list.mockRejectedValue(new Error('network'))
    const wrapper = await mount()
    await wrapper.vm.loadBranches()
    expect(wrapper.vm.branchesError).toBe('Не удалось загрузить филиалы')
  })

  it('validateField flags empty required', async () => {
    const wrapper = await mount()
    wrapper.vm.validateField('name')
    expect(wrapper.vm.fieldErrors.name).toBe('common.validation.required')
  })

  it('handleSubmit create success', async () => {
    propertiesApi.create.mockResolvedValue({ id: 99 })
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, validForm)
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/properties')
  })

  it('handleSubmit blocked when invalid', async () => {
    const wrapper = await mount()
    await wrapper.vm.handleSubmit()
    expect(propertiesApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.fieldErrors.name).toBeTruthy()
  })

  it('handleSubmit edit success', async () => {
    propertiesApi.get.mockResolvedValue({
      id: 5, name: 'X', address: 'Y', property_type: 'hotel', description: '', branch_id: null,
    })
    propertiesApi.update.mockResolvedValue({ id: 5 })
    const wrapper = await mount('/properties/5/edit')
    await wrapper.vm.loadProperty()
    Object.assign(wrapper.vm.form, { ...validForm, name: 'Updated' })
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/properties')
  })

  it('handleSubmit API error → formError', async () => {
    propertiesApi.create.mockRejectedValue({ response: { data: { error: ['Bad'] } } })
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, validForm)
    await wrapper.vm.handleSubmit()
    expect(wrapper.vm.formError).toBeTruthy()
    expect(wrapper.vm.submitting).toBe(false)
  })

  it('loadProperty error', async () => {
    propertiesApi.get.mockRejectedValue(new Error('404'))
    const wrapper = await mount('/properties/5/edit')
    await wrapper.vm.loadProperty()
    expect(wrapper.vm.formError).toBe('Не удалось загрузить объект')
  })
})
