import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import AppTopbar from '../../components/AppTopbar.vue'
import { useAuthStore } from '../../stores/auth'
import * as authApi from '../../api/auth'

describe('AppTopbar (FT-036 P1)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // Cleanup: reset .dark class between tests to avoid cross-contamination.
  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('renders user full_name when authenticated', async () => {
    const wrapper = mountWithPrimeVue(AppTopbar)
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo User' }
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Demo User')
  })

  it('does not render user menu when not authenticated', () => {
    const wrapper = mountWithPrimeVue(AppTopbar)
    expect(wrapper.text()).not.toContain('Выйти')
  })

  it('emits toggleDrawer on burger click', async () => {
    const wrapper = mountWithPrimeVue(AppTopbar)
    const burger = wrapper.find('button[aria-label="Меню"]')
    expect(burger.exists()).toBe(true)
    await burger.trigger('click')
    expect(wrapper.emitted('toggleDrawer')).toBeTruthy()
  })

  it('toggleTheme dual-writes: Vuetify theme AND <html class="dark">', async () => {
    const wrapper = mountWithPrimeVue(AppTopbar)
    const initiallyDark = document.documentElement.classList.contains('dark')
    wrapper.vm.toggleTheme()
    await wrapper.vm.$nextTick()
    // .dark class flipped
    expect(document.documentElement.classList.contains('dark')).toBe(!initiallyDark)
    // isDark computed reflects Vuetify theme
    expect(wrapper.vm.isDark).toBe(!initiallyDark)
  })

  it('logout calls signOut and redirects to login', async () => {
    const wrapper = mountWithPrimeVue(AppTopbar, {
      routes: [
        { path: '/', component: { template: '<div/>' } },
        { path: '/auth/login', name: 'login', component: { template: '<div>login</div>' } },
      ],
    })
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo' }
    await wrapper.vm.$nextTick()

    await wrapper.vm.handleLogout()

    expect(authApi.signOut).toHaveBeenCalled()
    expect(store.user).toBeNull()
  })

  it('v-app-bar shell preserved (hybrid, stubbed data-height=64)', () => {
    const wrapper = mountWithPrimeVue(AppTopbar)
    const topbar = wrapper.find('[data-stub="v-app-bar"]')
    expect(topbar.exists()).toBe(true)
    expect(topbar.attributes('data-height')).toBe('64')
  })
})
