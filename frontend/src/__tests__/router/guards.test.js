import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn(),
}))

import * as apiClient from '../../api/client'
import { useAuthStore } from '../../stores/auth'

// Per-suite createRouter — без рефактора `router/index.js`, по default action OQ-03.
// Импортируем guard косвенно: пересобираем routes + guard локально, чтобы spec
// не зависел от createWebHistory и от global router instance.
function buildRouter() {
  const routes = [
    { path: '/', name: 'Dashboard', component: { template: '<div/>' }, meta: { requiresAuth: true } },
    { path: '/properties', name: 'Properties', component: { template: '<div/>' }, meta: { requiresAuth: true } },
    { path: '/auth/login', name: 'login', component: { template: '<div/>' }, meta: { guest: true } },
  ]
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    if (!authStore.user && !authStore.loading) {
      await authStore.fetchCurrentUser()
    }
    const isAuthenticated = !!authStore.user
    const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
    const isGuestRoute = to.matched.some((r) => r.meta.guest)
    if (requiresAuth && !isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (isGuestRoute && isAuthenticated) {
      return { name: 'Dashboard' }
    }
  })
  return router
}

describe('router guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    apiClient.getAuthToken.mockReturnValue(null)
  })

  it('requiresAuth without session redirects to /auth/login with redirect query (SC-05)', async () => {
    const router = buildRouter()
    await router.push('/properties')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/properties')
  })

  it('guest route with active session redirects to Dashboard (NEG-01)', async () => {
    const router = buildRouter()
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo' }
    await router.push('/auth/login')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })

  it('authenticated user can access requiresAuth route', async () => {
    const router = buildRouter()
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo' }
    await router.push('/properties')
    expect(router.currentRoute.value.name).toBe('Properties')
  })

  it('widget route accessible without auth (meta.widget, no requiresAuth)', async () => {
    // Widget routes have neither requiresAuth nor guest — should pass through
    const routes = [
      { path: '/', name: 'Dashboard', component: { template: '<div/>' }, meta: { requiresAuth: true } },
      { path: '/auth/login', name: 'login', component: { template: '<div/>' }, meta: { guest: true } },
      { path: '/widget/:slug', name: 'BookingWidget', component: { template: '<div/>' }, meta: { widget: true } },
    ]
    const router = createRouter({ history: createMemoryHistory(), routes })
    router.beforeEach(async (to) => {
      const authStore = useAuthStore()
      if (!authStore.user && !authStore.loading) {
        await authStore.fetchCurrentUser()
      }
      const isAuthenticated = !!authStore.user
      const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
      const isGuestRoute = to.matched.some((r) => r.meta.guest)
      if (requiresAuth && !isAuthenticated) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }
      if (isGuestRoute && isAuthenticated) {
        return { name: 'Dashboard' }
      }
    })
    // No auth — widget should still be accessible
    await router.push('/widget/demo-org')
    expect(router.currentRoute.value.name).toBe('BookingWidget')
    expect(router.currentRoute.value.params.slug).toBe('demo-org')
  })

  it('redirect query preserves full path including query params', async () => {
    const routes = [
      { path: '/', name: 'Dashboard', component: { template: '<div/>' }, meta: { requiresAuth: true } },
      { path: '/auth/login', name: 'login', component: { template: '<div/>' }, meta: { guest: true } },
      { path: '/reservations', name: 'Reservations', component: { template: '<div/>' }, meta: { requiresAuth: true } },
    ]
    const router = createRouter({ history: createMemoryHistory(), routes })
    router.beforeEach(async (to) => {
      const authStore = useAuthStore()
      if (!authStore.user && !authStore.loading) await authStore.fetchCurrentUser()
      if (to.matched.some((r) => r.meta.requiresAuth) && !authStore.user) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }
    })
    await router.push('/reservations?status=confirmed')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/reservations?status=confirmed')
  })
})
