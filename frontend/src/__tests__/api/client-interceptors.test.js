import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'

import apiClient, {
  setAuthToken, setRefreshToken, getAuthToken, removeAuthTokens,
} from '../../api/client'

// Mock adapter: intercepts all requests made through apiClient(config)
// so they never hit the network. Returns a resolved 200 by default.
function mockAdapter() {
  const adapter = vi.fn().mockResolvedValue({ status: 200, data: {}, headers: {}, config: {} })
  apiClient.defaults.adapter = adapter
  return adapter
}

function restoreAdapter() {
  delete apiClient.defaults.adapter
}

describe('api/client interceptors', () => {
  let adapter

  beforeEach(() => {
    localStorage.clear()
    adapter = mockAdapter()
  })

  afterEach(() => {
    restoreAdapter()
  })

  describe('request interceptor', () => {
    it('adds Authorization header when token exists', () => {
      localStorage.setItem('auth_token', 'my-token')
      const interceptor = apiClient.interceptors.request.handlers[0]
      const config = { headers: {} }
      const result = interceptor.fulfilled(config)
      expect(result.headers.Authorization).toBe('Bearer my-token')
    })

    it('does not add Authorization header when no token', () => {
      const interceptor = apiClient.interceptors.request.handlers[0]
      const config = { headers: {} }
      const result = interceptor.fulfilled(config)
      expect(result.headers.Authorization).toBeUndefined()
    })

    it('adds X-Organization-Id header when org id exists', () => {
      localStorage.setItem('currentOrganizationId', '42')
      const interceptor = apiClient.interceptors.request.handlers[0]
      const config = { headers: {} }
      const result = interceptor.fulfilled(config)
      expect(result.headers['X-Organization-Id']).toBe('42')
    })

    it('does not add X-Organization-Id when not set', () => {
      const interceptor = apiClient.interceptors.request.handlers[0]
      const config = { headers: {} }
      const result = interceptor.fulfilled(config)
      expect(result.headers['X-Organization-Id']).toBeUndefined()
    })
  })

  describe('response interceptor', () => {
    const responseInterceptor = () => apiClient.interceptors.response.handlers[0]

    it('passes through successful responses', () => {
      const response = { status: 200, data: { ok: true } }
      const result = responseInterceptor().fulfilled(response)
      expect(result).toEqual(response)
    })

    it('rejects non-401 errors without retry', async () => {
      const error = { config: {}, response: { status: 500 } }
      await expect(responseInterceptor().rejected(error)).rejects.toEqual(error)
    })

    it('rejects 401 with _retry already set', async () => {
      const error = { config: { _retry: true }, response: { status: 401 } }
      await expect(responseInterceptor().rejected(error)).rejects.toEqual(error)
    })

    it('refresh success: updates tokens and retries original request', async () => {
      localStorage.setItem('refresh_token', 'refresh-abc')
      const config = { headers: {}, _retry: false, url: '/test', method: 'get' }
      const error = { config, response: { status: 401 } }

      const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
        data: { token: 'new-token', refresh_token: 'new-refresh' },
      })

      // apiClient(config) will hit our mock adapter
      await responseInterceptor().rejected(error)

      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        { refresh_token: 'refresh-abc' },
      )
      expect(localStorage.getItem('auth_token')).toBe('new-token')
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh')
      // Adapter was called for the retry
      expect(adapter).toHaveBeenCalled()

      postSpy.mockRestore()
    })

    it('refresh failure: clears tokens and redirects to login', async () => {
      localStorage.setItem('auth_token', 'old')
      localStorage.setItem('refresh_token', 'old-refresh')
      localStorage.setItem('currentOrganizationId', '1')

      const config = { headers: {}, _retry: false }
      const error = { config, response: { status: 401 } }

      const postSpy = vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'))

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      })

      await expect(responseInterceptor().rejected(error)).rejects.toEqual(error)

      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
      expect(localStorage.getItem('currentOrganizationId')).toBeNull()
      expect(window.location.href).toBe('/auth/login')

      postSpy.mockRestore()
    })

    it('no refresh_token: clears tokens immediately', async () => {
      const config = { headers: {}, _retry: false }
      const error = { config, response: { status: 401 } }

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      })

      await expect(responseInterceptor().rejected(error)).rejects.toEqual(error)
      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('concurrent 401: second request queues via subscriber and resolves after refresh', async () => {
      localStorage.setItem('refresh_token', 'r-token')

      let resolveRefresh
      const refreshPromise = new Promise((r) => { resolveRefresh = r })
      const postSpy = vi.spyOn(axios, 'post').mockReturnValue(refreshPromise)

      const config1 = { headers: {}, _retry: false, url: '/a', method: 'get' }
      const config2 = { headers: {}, _retry: false, url: '/b', method: 'get' }
      const error1 = { config: config1, response: { status: 401 } }
      const error2 = { config: config2, response: { status: 401 } }

      // First 401 starts refresh (isRefreshing = true)
      const p1 = responseInterceptor().rejected(error1)
      // Second 401 hits subscriber queue (lines 75-82)
      const p2 = responseInterceptor().rejected(error2)

      // Resolve refresh
      resolveRefresh({ data: { token: 'fresh-t', refresh_token: 'fresh-r' } })

      // Both promises should resolve (adapter returns 200 for retries)
      await Promise.all([p1, p2])

      expect(localStorage.getItem('auth_token')).toBe('fresh-t')
      // Adapter called twice: once for p1 retry, once for p2 retry via subscriber
      expect(adapter).toHaveBeenCalledTimes(2)

      postSpy.mockRestore()
    })

    it('concurrent 401: subscriber rejects when refresh fails (newToken is null)', async () => {
      localStorage.setItem('refresh_token', 'r-token')

      let rejectRefresh
      const refreshPromise = new Promise((_, r) => { rejectRefresh = r })
      const postSpy = vi.spyOn(axios, 'post').mockReturnValue(refreshPromise)

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      })

      const config1 = { headers: {}, _retry: false, url: '/a', method: 'get' }
      const config2 = { headers: {}, _retry: false, url: '/b', method: 'get' }
      const error1 = { config: config1, response: { status: 401 } }
      const error2 = { config: config2, response: { status: 401 } }

      // First 401 starts refresh
      const p1 = responseInterceptor().rejected(error1)
      // Second 401 queues via subscriber
      const p2 = responseInterceptor().rejected(error2)

      // Refresh fails → onRefreshed(null) → subscriber rejects
      rejectRefresh(new Error('refresh failed'))

      await expect(p1).rejects.toEqual(error1)
      await expect(p2).rejects.toEqual(error2)

      postSpy.mockRestore()
    })
  })
})
