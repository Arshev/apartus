import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(),
  setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(),
  getAuthToken: vi.fn(),
}))

import * as authApi from '../../api/auth'
import * as apiClient from '../../api/client'
import { useAuthStore } from '../../stores/auth'

const ORG_A = { id: 1, name: 'Org A' }
const ORG_B = { id: 2, name: 'Org B' }
const USER = { id: 10, full_name: 'Demo User', email: 'demo@apartus.local' }

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    apiClient.getAuthToken.mockReturnValue('token-123')
  })

  describe('signIn', () => {
    it('single-org: sets user and resolves switchOrganization (refetches user)', async () => {
      authApi.signIn.mockResolvedValue({
        token: 't', refresh_token: 'r', user: USER, organizations: [ORG_A],
      })
      authApi.getCurrentUser.mockResolvedValue({
        user: USER, organizations: [ORG_A], organization: ORG_A,
        membership: { role: 'owner', permissions: [] },
      })

      const store = useAuthStore()
      await store.signIn({ email: 'x', password: 'y' })

      expect(store.user).toEqual(USER)
      expect(store.organization).toEqual(ORG_A)
      expect(store.membership).toEqual({ role: 'owner', permissions: [] })
      expect(localStorage.getItem('currentOrganizationId')).toBe('1')
      expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1)
    })

    it('multi-org: sets organizations but does not auto-switch', async () => {
      authApi.signIn.mockResolvedValue({
        token: 't', refresh_token: 'r', user: USER, organizations: [ORG_A, ORG_B],
      })

      const store = useAuthStore()
      await store.signIn({ email: 'x', password: 'y' })

      expect(store.user).toEqual(USER)
      expect(store.organizations).toHaveLength(2)
      expect(store.organization).toBeNull()
      expect(authApi.getCurrentUser).not.toHaveBeenCalled()
    })

    it('failure: stores error message and rethrows', async () => {
      authApi.signIn.mockRejectedValue({ response: { data: { error: 'bad creds' } } })
      const store = useAuthStore()
      await expect(store.signIn({ email: 'x', password: 'y' })).rejects.toBeDefined()
      expect(store.error).toBe('bad creds')
      expect(store.loading).toBe(false)
    })
  })

  describe('signOut', () => {
    it('clears session on success', async () => {
      authApi.signOut.mockResolvedValue({})
      const store = useAuthStore()
      store.user = USER
      await store.signOut()
      expect(store.user).toBeNull()
      expect(store.organization).toBeNull()
      expect(apiClient.removeAuthTokens).toHaveBeenCalled()
    })

    it('clears session even when network call fails (FM-03)', async () => {
      authApi.signOut.mockRejectedValue(new Error('network'))
      const store = useAuthStore()
      store.user = USER
      await expect(store.signOut()).rejects.toThrow('network')
      expect(store.user).toBeNull()
      expect(apiClient.removeAuthTokens).toHaveBeenCalled()
    })

    // FT-019: locale must not leak across accounts on shared devices.
    it('clears persisted locale on signOut', async () => {
      authApi.signOut.mockResolvedValue({})
      localStorage.setItem('locale', 'en')
      const store = useAuthStore()
      store.user = USER
      await store.signOut()
      expect(localStorage.getItem('locale')).toBeNull()
    })
  })

  describe('switchOrganization', () => {
    it('is async and refetches user (membership/permissions update)', async () => {
      authApi.getCurrentUser.mockResolvedValue({
        user: USER, organizations: [ORG_A, ORG_B], organization: ORG_B,
        membership: { role: 'manager', permissions: ['read'] },
      })
      const store = useAuthStore()
      const result = store.switchOrganization(ORG_B)
      expect(result).toBeInstanceOf(Promise)
      await result
      expect(localStorage.getItem('currentOrganizationId')).toBe('2')
      expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1)
      expect(store.organization).toEqual(ORG_B)
      expect(store.membership.role).toBe('manager')
    })
  })

  describe('fetchCurrentUser', () => {
    it('happy path populates state', async () => {
      authApi.getCurrentUser.mockResolvedValue({
        user: USER, organizations: [ORG_A], organization: ORG_A,
        membership: { role: 'owner', permissions: [] },
      })
      const store = useAuthStore()
      await store.fetchCurrentUser()
      expect(store.user).toEqual(USER)
      expect(store.organization).toEqual(ORG_A)
      expect(store.loading).toBe(false)
    })

    it('returns null when no token, does not call API', async () => {
      apiClient.getAuthToken.mockReturnValue(null)
      const store = useAuthStore()
      const result = await store.fetchCurrentUser()
      expect(result).toBeNull()
      expect(authApi.getCurrentUser).not.toHaveBeenCalled()
    })

    it('clears session on API failure (NEG-02 / FM-01)', async () => {
      authApi.getCurrentUser.mockRejectedValue(new Error('401'))
      const store = useAuthStore()
      store.user = USER
      await store.fetchCurrentUser()
      expect(store.user).toBeNull()
      expect(store.organization).toBeNull()
      expect(apiClient.removeAuthTokens).toHaveBeenCalled()
      expect(store.loading).toBe(false)
    })
  })

  describe('loading state (SC-06)', () => {
    it('toggles loading during signIn lifecycle', async () => {
      let inflight
      authApi.signIn.mockImplementation(() => new Promise((resolve) => { inflight = resolve }))
      const store = useAuthStore()
      const p = store.signIn({ email: 'x', password: 'y' })
      expect(store.loading).toBe(true)
      inflight({ token: 't', refresh_token: 'r', user: USER, organizations: [] })
      await p
      expect(store.loading).toBe(false)
    })
  })

  describe('computed flags', () => {
    it('isOwner / isManager / can react to membership', () => {
      const store = useAuthStore()
      store.membership = { role: 'owner', permissions: [] }
      expect(store.isOwner).toBe(true)
      expect(store.isManager).toBe(true)
      expect(store.can('anything')).toBe(true)

      store.membership = { role: 'member', permissions: ['read'] }
      expect(store.isOwner).toBe(false)
      expect(store.isManager).toBe(false)
      expect(store.can('read')).toBe(true)
      expect(store.can('write')).toBe(false)
    })
  })
})
