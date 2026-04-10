import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/guests', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import { mountWithVuetify, mountWithVuetifyAsync } from '../helpers/mountWithVuetify'
import GuestFormView from '../../views/GuestFormView.vue'
import * as guestsApi from '../../api/guests'

const ROUTES = [
  { path: '/guests', component: { template: '<div/>' } },
  { path: '/guests/new', name: 'GuestNew', component: GuestFormView },
  { path: '/guests/:id/edit', name: 'GuestEdit', component: GuestFormView },
]

describe('GuestFormView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders create mode', () => {
    const wrapper = mountWithVuetify(GuestFormView, { routes: ROUTES })
    expect(wrapper.text()).toContain('Новый гость')
  })

  it('validation rules', () => {
    const wrapper = mountWithVuetify(GuestFormView, { routes: ROUTES })
    expect(wrapper.vm.rules.required('')).toBe('Обязательное поле')
    expect(wrapper.vm.rules.required('x')).toBe(true)
  })

  it('loadGuest in edit mode', async () => {
    guestsApi.get.mockResolvedValue({
      id: 1, first_name: 'Alice', last_name: 'Smith', email: 'a@b.c', phone: '', notes: '',
    })
    const wrapper = await mountWithVuetifyAsync(GuestFormView, {
      routes: ROUTES,
      initialRoute: '/guests/1/edit',
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.loadGuest()
    expect(wrapper.vm.form.first_name).toBe('Alice')
  })

  it('handleSubmit create', async () => {
    guestsApi.create.mockResolvedValue({ id: 1 })
    const wrapper = await mountWithVuetifyAsync(GuestFormView, {
      routes: ROUTES,
      initialRoute: '/guests/new',
    })
    wrapper.vm.form = { first_name: 'A', last_name: 'B', email: '', phone: '', notes: '' }
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/guests')
  })

  it('handleSubmit edit', async () => {
    guestsApi.get.mockResolvedValue({ id: 1, first_name: 'A', last_name: 'B', email: '', phone: '', notes: '' })
    guestsApi.update.mockResolvedValue({ id: 1 })
    const wrapper = await mountWithVuetifyAsync(GuestFormView, {
      routes: ROUTES,
      initialRoute: '/guests/1/edit',
    })
    wrapper.vm.form = { first_name: 'Updated', last_name: 'B', email: '', phone: '', notes: '' }
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleSubmit()
    expect(pushSpy).toHaveBeenCalledWith('/guests')
  })

  it('handleSubmit error', async () => {
    guestsApi.create.mockRejectedValue({ response: { data: { error: ['dup email'] } } })
    const wrapper = await mountWithVuetifyAsync(GuestFormView, {
      routes: ROUTES,
      initialRoute: '/guests/new',
    })
    wrapper.vm.form = { first_name: 'A', last_name: 'B', email: 'dup@x.com', phone: '', notes: '' }
    await wrapper.vm.handleSubmit()
    expect(wrapper.vm.formError).toBeTruthy()
  })

  it('loadGuest error', async () => {
    guestsApi.get.mockRejectedValue(new Error('404'))
    const wrapper = await mountWithVuetifyAsync(GuestFormView, {
      routes: ROUTES,
      initialRoute: '/guests/1/edit',
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.loadGuest()
    expect(wrapper.vm.formError).toBe('Не удалось загрузить гостя')
  })
})
