import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as membersApi from '../../api/members'

describe('api/members', () => {
  it('list calls GET /members', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await membersApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/members')
  })
  it('create calls POST /members', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await membersApi.create({ email: 'a@b.c', role: 'member' })
    expect(apiClient.post).toHaveBeenCalledWith('/members', { email: 'a@b.c', role: 'member' })
  })
  it('update calls PATCH /members/:id', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await membersApi.update(1, { role_enum: 'manager' })
    expect(apiClient.patch).toHaveBeenCalledWith('/members/1', { role_enum: 'manager' })
  })
  it('destroy calls DELETE /members/:id', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await membersApi.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/members/1')
  })
})
