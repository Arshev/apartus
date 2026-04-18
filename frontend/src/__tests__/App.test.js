import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}))
vi.mock('../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue(null),
}))

import { mountWithPrimeVue } from './helpers/mountWithPrimeVue'
import App from '../App.vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'

describe('App.vue gating', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders DefaultLayout when route is not guest and not selectOrganization', async () => {
    const wrapper = mountWithPrimeVue(App, {
      routes: [
        { path: '/', name: 'Dashboard', component: { template: '<div>dash</div>' }, meta: { requiresAuth: true } },
      ],
      global: {
        stubs: {
          DefaultLayout: { template: '<div data-test="default-layout">layout</div>' },
        },
      },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="default-layout"]').exists()).toBe(true)
  })

  it('does not render DefaultLayout on guest route', async () => {
    const wrapper = mountWithPrimeVue(App, {
      routes: [
        { path: '/', component: { template: '<div/>' } },
        { path: '/auth/login', name: 'login', component: { template: '<div>login</div>' }, meta: { guest: true } },
      ],
      global: {
        stubs: {
          DefaultLayout: { template: '<div data-test="default-layout">layout</div>' },
        },
      },
    })
    await wrapper.vm.$router.push('/auth/login')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="default-layout"]').exists()).toBe(false)
  })

  it('imports DefaultLayout component (sanity)', () => {
    expect(DefaultLayout).toBeDefined()
  })
})
