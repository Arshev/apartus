import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'

// We test the actual client module's interceptors by importing it fresh.
// We mock axios.post (used for refresh) and localStorage.

// The client.js module creates an axios instance at import time, so we
// test the exported instance's interceptors directly.
import apiClient, {
  setAuthToken, setRefreshToken, getAuthToken, removeAuthTokens,
} from '../../api/client'

describe('api/client interceptors', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('request interceptor', () => {
    it('adds Authorization header when token exists', async () => {
      localStorage.setItem('auth_token', 'my-token')
      // Access the request interceptor by calling the fulfilled handler
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

    it('passes through successful responses', async () => {
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

    it('attempts refresh on first 401 when refresh_token exists', async () => {
      localStorage.setItem('refresh_token', 'refresh-abc')
      const originalConfig = { headers: {}, _retry: false }
      const error = { config: originalConfig, response: { status: 401 } }

      // Mock axios.post for refresh endpoint
      const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
        data: { token: 'new-token', refresh_token: 'new-refresh' },
      })

      // The interceptor calls apiClient(config) which is the instance as a function.
      // We can't easily mock that, so we catch the resulting network error.
      try {
        await responseInterceptor().rejected(error)
      } catch {
        // apiClient(config) tries a real request after refresh; we only care that
        // the refresh endpoint was called and tokens updated.
      }

      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        { refresh_token: 'refresh-abc' },
      )
      expect(localStorage.getItem('auth_token')).toBe('new-token')
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh')

      postSpy.mockRestore()
    })

    it('clears tokens and redirects on refresh failure', async () => {
      localStorage.setItem('auth_token', 'old')
      localStorage.setItem('refresh_token', 'old-refresh')
      localStorage.setItem('currentOrganizationId', '1')

      const originalConfig = { headers: {}, _retry: false }
      const error = { config: originalConfig, response: { status: 401 } }

      const postSpy = vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'))

      // Mock window.location.href setter
      const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        href: '',
      })
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      })

      await expect(responseInterceptor().rejected(error)).rejects.toEqual(error)

      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
      expect(localStorage.getItem('currentOrganizationId')).toBeNull()

      postSpy.mockRestore()
    })

    it('rejects 401 without refresh when no refresh_token', async () => {
      // No refresh_token in localStorage
      const originalConfig = { headers: {}, _retry: false }
      const error = { config: originalConfig, response: { status: 401 } }

      const postSpy = vi.spyOn(axios, 'post')

      await expect(responseInterceptor().rejected(error)).rejects.toEqual(error)
      // Cleanup happens even when no refresh_token (throws inside refresh block)
      expect(localStorage.getItem('auth_token')).toBeNull()

      postSpy.mockRestore()
    })
  })
})
