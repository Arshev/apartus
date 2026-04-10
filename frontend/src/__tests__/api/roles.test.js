import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as rolesApi from '../../api/roles'

describe('api/roles', () => {
  it('list calls GET /roles', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await rolesApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/roles')
  })
  it('create wraps in { role }', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await rolesApi.create({ name: 'Admin', code: 'admin' })
    expect(apiClient.post).toHaveBeenCalledWith('/roles', { role: { name: 'Admin', code: 'admin' } })
  })
  it('update calls PATCH', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await rolesApi.update(1, { name: 'Updated' })
    expect(apiClient.patch).toHaveBeenCalledWith('/roles/1', { role: { name: 'Updated' } })
  })
  it('destroy calls DELETE', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await rolesApi.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/roles/1')
  })
})
