import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as branchesApi from '../../api/branches'

describe('api/branches', () => {
  it('list calls GET /branches', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await branchesApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/branches')
  })
  it('get calls GET /branches/:id', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1 } })
    await branchesApi.get(1)
    expect(apiClient.get).toHaveBeenCalledWith('/branches/1')
  })
  it('create wraps in { branch }', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await branchesApi.create({ name: 'HQ' })
    expect(apiClient.post).toHaveBeenCalledWith('/branches', { branch: { name: 'HQ' } })
  })
  it('update calls PATCH', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await branchesApi.update(1, { name: 'Main' })
    expect(apiClient.patch).toHaveBeenCalledWith('/branches/1', { branch: { name: 'Main' } })
  })
  it('destroy calls DELETE', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await branchesApi.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/branches/1')
  })
})
