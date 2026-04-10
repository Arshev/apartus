import { describe, it, expect, beforeEach } from 'vitest'

// We test the exported helpers and the module shape, not the interceptors
// (those require an actual axios mock server). Interceptor logic is
// integration-level and covered by auth store specs + manual smoke.
import apiClient, {
  setAuthToken, setRefreshToken, getAuthToken, removeAuthTokens,
} from '../../api/client'

describe('api/client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports an axios instance with baseURL', () => {
    expect(apiClient.defaults.baseURL).toContain('/api/v1')
  })

  it('exports Content-Type and Accept headers', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
    expect(apiClient.defaults.headers['Accept']).toBe('application/json')
  })

  it('setAuthToken writes to localStorage', () => {
    setAuthToken('abc')
    expect(localStorage.getItem('auth_token')).toBe('abc')
  })

  it('setRefreshToken writes to localStorage', () => {
    setRefreshToken('xyz')
    expect(localStorage.getItem('refresh_token')).toBe('xyz')
  })

  it('getAuthToken reads from localStorage', () => {
    localStorage.setItem('auth_token', 'token-1')
    expect(getAuthToken()).toBe('token-1')
  })

  it('getAuthToken returns null when missing', () => {
    expect(getAuthToken()).toBeNull()
  })

  it('removeAuthTokens clears both tokens', () => {
    localStorage.setItem('auth_token', 't')
    localStorage.setItem('refresh_token', 'r')
    removeAuthTokens()
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })
})
