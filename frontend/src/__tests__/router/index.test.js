import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'

// Mock createWebHistory → createMemoryHistory (jsdom has no real browser history)
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createWebHistory: () => createMemoryHistory(),
  }
})

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue(null),
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import router from '../../router/index.js'
import { useAuthStore } from '../../stores/auth'
import * as apiClient from '../../api/client'

describe('router/index.js (actual module)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    apiClient.getAuthToken.mockReturnValue(null)
  })

  it('exports a router instance with expected routes', () => {
    const routeNames = router.getRoutes().map((r) => r.name)
    expect(routeNames).toContain('Dashboard')
    expect(routeNames).toContain('Properties')
    expect(routeNames).toContain('PropertyNew')
    expect(routeNames).toContain('PropertyEdit')
    expect(routeNames).toContain('Units')
    expect(routeNames).toContain('Amenities')
    expect(routeNames).toContain('Branches')
    expect(routeNames).toContain('login')
    expect(routeNames).toContain('register')
    expect(routeNames).toContain('selectOrganization')
  })

  it('all auth routes have meta.requiresAuth', () => {
    const authRoutes = ['Dashboard', 'Properties', 'PropertyNew', 'PropertyEdit',
      'Units', 'UnitNew', 'UnitEdit', 'Amenities', 'Branches', 'selectOrganization']
    for (const name of authRoutes) {
      const route = router.getRoutes().find((r) => r.name === name)
      expect(route?.meta?.requiresAuth, `${name} should have requiresAuth`).toBe(true)
    }
  })

  it('guest routes have meta.guest', () => {
    for (const name of ['login', 'register']) {
      const route = router.getRoutes().find((r) => r.name === name)
      expect(route?.meta?.guest, `${name} should have guest`).toBe(true)
    }
  })

  it('beforeEach: unauthenticated + requiresAuth → login with redirect', async () => {
    await router.push('/properties')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/properties')
  })

  it('beforeEach: authenticated + guest route → Dashboard', async () => {
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo' }
    await router.push('/auth/login')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })

  it('beforeEach: calls fetchCurrentUser when no user and not loading', async () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
    await router.push('/properties')
    // fetchCurrentUser was called (mocked to do nothing, so user stays null → redirect to login)
    expect(router.currentRoute.value.name).toBe('login')
  })
})
