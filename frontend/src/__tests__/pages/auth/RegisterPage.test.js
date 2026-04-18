import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}))
vi.mock('../../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue(null),
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import { mountWithPrimeVueAsync } from '../../helpers/mountWithPrimeVue'
import RegisterPage from '../../../pages/auth/RegisterPage.vue'
import * as authApi from '../../../api/auth'

const ROUTES = [
  { path: '/', name: 'Dashboard', component: { template: '<div/>' } },
  { path: '/auth/login', name: 'login', component: { template: '<div/>' } },
  { path: '/auth/register', name: 'register', component: RegisterPage },
]

async function mount() {
  return mountWithPrimeVueAsync(RegisterPage, { routes: ROUTES, initialRoute: '/auth/register' })
}

const validForm = {
  organization_name: 'Acme',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  password: 'longpass1',
  password_confirmation: 'longpass1',
}

describe('RegisterPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders registration form', async () => {
    const wrapper = await mount()
    expect(wrapper.text()).toContain('Регистрация')
    expect(wrapper.text()).toContain('Создать аккаунт')
    expect(wrapper.text()).toContain('Войти')
  })

  it('validateField flags empty required field', async () => {
    const wrapper = await mount()
    wrapper.vm.validateField('organization_name')
    expect(wrapper.vm.fieldErrors.organization_name).toBe('common.validation.required')
  })

  it('validateField clears error on valid value', async () => {
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, validForm)
    wrapper.vm.validateField('email')
    expect(wrapper.vm.fieldErrors.email).toBe('')
  })

  it('password mismatch caught by schema', async () => {
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, { ...validForm, password_confirmation: 'different' })
    await wrapper.vm.handleRegister()
    expect(wrapper.vm.fieldErrors.password_confirmation).toBe('common.validation.passwordsMismatch')
    expect(authApi.signUp).not.toHaveBeenCalled()
  })

  it('handleRegister redirects to / on success', async () => {
    authApi.signUp.mockResolvedValue({
      token: 't', refresh_token: 'r', user: { id: 1 },
      organization: { id: 1 },
    })
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, validForm)
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleRegister()
    expect(pushSpy).toHaveBeenCalledWith('/')
  })

  it('handleRegister does nothing when invalid', async () => {
    const wrapper = await mount()
    // empty form
    await wrapper.vm.handleRegister()
    expect(authApi.signUp).not.toHaveBeenCalled()
    expect(Object.keys(wrapper.vm.fieldErrors).length).toBeGreaterThan(0)
  })

  it('handleRegister error caught silently', async () => {
    authApi.signUp.mockRejectedValue(new Error('409'))
    const wrapper = await mount()
    Object.assign(wrapper.vm.form, validForm)
    await wrapper.vm.handleRegister()
    // no throw, no redirect
  })
})
