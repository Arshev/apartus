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

import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import RegisterPage from '../../../pages/auth/RegisterPage.vue'
import * as authApi from '../../../api/auth'

const ROUTES = [
  { path: '/', name: 'Dashboard', component: { template: '<div/>' } },
  { path: '/auth/login', name: 'login', component: { template: '<div/>' } },
  { path: '/auth/register', name: 'register', component: RegisterPage },
]

describe('RegisterPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders registration form', () => {
    const wrapper = mountWithVuetify(RegisterPage, { routes: ROUTES })
    expect(wrapper.text()).toContain('Регистрация')
    expect(wrapper.text()).toContain('Создать аккаунт')
    expect(wrapper.text()).toContain('Войти')
  })

  it('validation rules', () => {
    const wrapper = mountWithVuetify(RegisterPage, { routes: ROUTES })
    expect(wrapper.vm.rules.required('')).toBe('Обязательное поле')
    expect(wrapper.vm.rules.email('x')).toBe('Некорректный email')
    expect(wrapper.vm.rules.minLength('short')).toBe('Минимум 8 символов')
    expect(wrapper.vm.rules.minLength('longpassword')).toBe(true)
  })

  it('passwordMatch rule compares with form.password', () => {
    const wrapper = mountWithVuetify(RegisterPage, { routes: ROUTES })
    wrapper.vm.form.password = 'secret123'
    expect(wrapper.vm.rules.passwordMatch('secret123')).toBe(true)
    expect(wrapper.vm.rules.passwordMatch('wrong')).toBe('Пароли не совпадают')
  })

  it('handleRegister redirects to / on success', async () => {
    authApi.signUp.mockResolvedValue({
      token: 't', refresh_token: 'r', user: { id: 1 },
      organization: { id: 1 },
    })
    const wrapper = mountWithVuetify(RegisterPage, { routes: ROUTES })
    wrapper.vm.formValid = true
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleRegister()
    expect(pushSpy).toHaveBeenCalledWith('/')
  })

  it('handleRegister does nothing when invalid', async () => {
    const wrapper = mountWithVuetify(RegisterPage, { routes: ROUTES })
    wrapper.vm.formValid = false
    await wrapper.vm.handleRegister()
    expect(authApi.signUp).not.toHaveBeenCalled()
  })

  it('handleRegister error: caught silently', async () => {
    authApi.signUp.mockRejectedValue(new Error('409'))
    const wrapper = mountWithVuetify(RegisterPage, { routes: ROUTES })
    wrapper.vm.formValid = true
    await wrapper.vm.handleRegister()
    // No throw, stays on page
  })
})
