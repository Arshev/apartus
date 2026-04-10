import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn().mockResolvedValue({}),
  getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(),
  setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(),
  getAuthToken: vi.fn().mockReturnValue('t'),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import AppTopbar from '../../components/AppTopbar.vue'
import { useAuthStore } from '../../stores/auth'
import * as authApi from '../../api/auth'

describe('AppTopbar', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders user full_name when authenticated', () => {
    const wrapper = mountWithVuetify(AppTopbar)
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo User' }
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.text()).toContain('Demo User')
    })
  })

  it('does not render user menu when not authenticated', () => {
    const wrapper = mountWithVuetify(AppTopbar)
    expect(wrapper.text()).not.toContain('Выйти')
  })

  it('renders v-progress-linear when authStore.loading is true (SC-06)', async () => {
    const wrapper = mountWithVuetify(AppTopbar)
    const store = useAuthStore()
    store.loading = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.v-progress-linear-stub').exists()).toBe(true)
  })

  it('logout calls signOut and redirects to login (SC-02)', async () => {
    const loginPage = { template: '<div>login</div>' }
    const wrapper = mountWithVuetify(AppTopbar, {
      routes: [
        { path: '/', component: { template: '<div/>' } },
        { path: '/auth/login', name: 'login', component: loginPage },
      ],
    })
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo' }
    await wrapper.vm.$nextTick()

    await wrapper.vm.handleLogout()

    expect(authApi.signOut).toHaveBeenCalled()
    expect(store.user).toBeNull()
  })
})
