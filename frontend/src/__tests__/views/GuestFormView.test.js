import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/guests', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import { mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import GuestFormView from '../../views/GuestFormView.vue'
import * as guestsApi from '../../api/guests'

const ROUTES = [
  { path: '/guests', component: { template: '<div/>' } },
  { path: '/guests/new', name: 'GuestNew', component: GuestFormView },
  { path: '/guests/:id/edit', name: 'GuestEdit', component: GuestFormView },
]

async function mount(route = '/guests/new') {
  return mountWithPrimeVueAsync(GuestFormView, { routes: ROUTES, initialRoute: route })
}

describe('GuestFormView (FT-036 P2)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders create mode', async () => {
    const wrapper = await mount()
    expect(wrapper.text()).toContain('Новый гость')
  })

  it('validateField flags empty required', async () => {
    const wrapper = await mount()
    wrapper.vm.validateField('first_name')
    expect(wrapper.vm.fieldErrors.first_name).toBe('common.validation.required')
  })

  it('validateField clears when valid', async () => {
    const wrapper = await mount()
    wrapper.vm.form.first_name = 'Alice'
    wrapper.vm.validateField('first_name')
    expect(wrapper.vm.fieldErrors.first_name).toBe('')
  })

  it('loadGuest in edit mode', async () => {
    guestsApi.get.mockResolvedValue({
      id: 1, first_name: 'Alice', last_name: 'Smith', email: 'a@b.com', phone: '', notes: '',
    })
    const wrapper = await mount('/guests/1/edit')
    await wrapper.vm.loadGuest()
    expect(wrapper.vm.form.first_name).toBe('Alice')
  })

  it('handleSubmit create success', async () => {
    guestsApi.create.mockResolvedValue({ id: 1 })
    const wrapper = await mount()
    wrapper.vm.form.first_name = 'A'
    wrapper.vm.form.last_name = 'B'
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/guests')
  })

  it('handleSubmit blocked when invalid (empty)', async () => {
    const wrapper = await mount()
    await wrapper.vm.handleSubmit()
    expect(guestsApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.fieldErrors.first_name).toBeTruthy()
  })

  it('handleSubmit edit success', async () => {
    guestsApi.get.mockResolvedValue({
      id: 1, first_name: 'A', last_name: 'B', email: '', phone: '', notes: '',
    })
    guestsApi.update.mockResolvedValue({ id: 1 })
    const wrapper = await mount('/guests/1/edit')
    await wrapper.vm.loadGuest()
    wrapper.vm.form.first_name = 'Updated'
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/guests')
  })

  it('handleSubmit API error → formError set', async () => {
    guestsApi.create.mockRejectedValue({ response: { data: { error: 'dup email' } } })
    const wrapper = await mount()
    wrapper.vm.form.first_name = 'A'
    wrapper.vm.form.last_name = 'B'
    await wrapper.vm.handleSubmit()
    expect(wrapper.vm.formError).toBe('dup email')
  })

  it('loadGuest error', async () => {
    guestsApi.get.mockRejectedValue(new Error('404'))
    const wrapper = await mount('/guests/1/edit')
    await wrapper.vm.loadGuest()
    expect(wrapper.vm.formError).toBe('Не удалось загрузить гостя')
  })
})
