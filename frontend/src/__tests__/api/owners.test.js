import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/owners'

describe('api/owners', () => {
  it('list', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list()
    expect(apiClient.get).toHaveBeenCalledWith('/owners')
  })
  it('create', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await api.create({ name: 'A' })
    expect(apiClient.post).toHaveBeenCalledWith('/owners', { owner: { name: 'A' } })
  })
  it('update', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await api.update(1, { name: 'B' })
    expect(apiClient.patch).toHaveBeenCalledWith('/owners/1', { owner: { name: 'B' } })
  })
  it('destroy', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/owners/1')
  })
  it('statement', async () => {
    apiClient.get.mockResolvedValue({ data: { total_revenue: 100 } })
    await api.statement(1, { from: '2026-04-01' })
    expect(apiClient.get).toHaveBeenCalledWith('/owners/1/statement', { params: { from: '2026-04-01' } })
  })
})
