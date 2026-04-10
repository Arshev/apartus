import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as authApi from '../../api/auth'

describe('api/auth', () => {
  it('signUp calls POST /auth/sign_up', async () => {
    apiClient.post.mockResolvedValue({ data: { token: 't', user: {} } })
    const result = await authApi.signUp({ email: 'a@b.c' })
    expect(apiClient.post).toHaveBeenCalledWith('/auth/sign_up', { email: 'a@b.c' })
    expect(result).toEqual({ token: 't', user: {} })
  })

  it('signIn calls POST /auth/sign_in', async () => {
    apiClient.post.mockResolvedValue({ data: { token: 't' } })
    await authApi.signIn({ email: 'a@b.c', password: 'p' })
    expect(apiClient.post).toHaveBeenCalledWith('/auth/sign_in', { email: 'a@b.c', password: 'p' })
  })

  it('signOut calls DELETE /auth/sign_out', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await authApi.signOut()
    expect(apiClient.delete).toHaveBeenCalledWith('/auth/sign_out')
  })

  it('getCurrentUser calls GET /auth/me', async () => {
    apiClient.get.mockResolvedValue({ data: { user: { id: 1 } } })
    const result = await authApi.getCurrentUser()
    expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
    expect(result).toEqual({ user: { id: 1 } })
  })
})
