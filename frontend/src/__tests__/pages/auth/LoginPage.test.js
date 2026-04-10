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
import LoginPage from '../../../pages/auth/LoginPage.vue'
import { useAuthStore } from '../../../stores/auth'
import * as authApi from '../../../api/auth'

const ROUTES = [
  { path: '/', name: 'Dashboard', component: { template: '<div/>' } },
  { path: '/auth/login', name: 'login', component: LoginPage },
  { path: '/auth/register', name: 'register', component: { template: '<div/>' } },
  { path: '/auth/select-organization', name: 'selectOrganization', component: { template: '<div/>' } },
]

describe('LoginPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders login form with email and password fields', () => {
    const wrapper = mountWithVuetify(LoginPage, { routes: ROUTES })
    expect(wrapper.text()).toContain('Apartus')
    expect(wrapper.text()).toContain('Войти')
    expect(wrapper.text()).toContain('Регистрация')
  })

  it('has validation rules', () => {
    const wrapper = mountWithVuetify(LoginPage, { routes: ROUTES })
    expect(wrapper.vm.rules.required('')).toBe('Обязательное поле')
    expect(wrapper.vm.rules.email('bad')).toBe('Некорректный email')
    expect(wrapper.vm.rules.email('a@b.c')).toBe(true)
  })

  it('handleLogin with single org redirects to /', async () => {
    authApi.signIn.mockResolvedValue({
      token: 't', refresh_token: 'r', user: { id: 1 },
      organizations: [{ id: 1, name: 'Org' }],
    })
    authApi.getCurrentUser.mockResolvedValue({
      user: { id: 1 }, organizations: [{ id: 1 }],
      organization: { id: 1 }, membership: { role: 'owner', permissions: [] },
    })
    const wrapper = mountWithVuetify(LoginPage, { routes: ROUTES })
    wrapper.vm.form.email = 'a@b.c'
    wrapper.vm.form.password = 'pass'
    wrapper.vm.formValid = true
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleLogin()
    expect(pushSpy).toHaveBeenCalledWith('/')
  })

  it('handleLogin with multi org redirects to selectOrganization', async () => {
    authApi.signIn.mockResolvedValue({
      token: 't', refresh_token: 'r', user: { id: 1 },
      organizations: [{ id: 1 }, { id: 2 }],
    })
    const wrapper = mountWithVuetify(LoginPage, { routes: ROUTES })
    wrapper.vm.form.email = 'a@b.c'
    wrapper.vm.form.password = 'pass'
    wrapper.vm.formValid = true
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.handleLogin()
    expect(pushSpy).toHaveBeenCalledWith({ name: 'selectOrganization' })
  })

  it('handleLogin does nothing when form invalid', async () => {
    const wrapper = mountWithVuetify(LoginPage, { routes: ROUTES })
    wrapper.vm.formValid = false
    await wrapper.vm.handleLogin()
    expect(authApi.signIn).not.toHaveBeenCalled()
  })

  it('handleLogin error: caught silently (error handled by store)', async () => {
    authApi.signIn.mockRejectedValue(new Error('network'))
    const wrapper = mountWithVuetify(LoginPage, { routes: ROUTES })
    wrapper.vm.formValid = true
    // Should not throw
    await wrapper.vm.handleLogin()
    // Stays on page, no redirect
  })
})
