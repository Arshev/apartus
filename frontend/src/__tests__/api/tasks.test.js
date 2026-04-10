import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/tasks'

describe('api/tasks', () => {
  it('list', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list({ status: 'pending' })
    expect(apiClient.get).toHaveBeenCalledWith('/tasks', { params: { status: 'pending' } })
  })
  it('create', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await api.create({ title: 'Clean' })
    expect(apiClient.post).toHaveBeenCalledWith('/tasks', { task: { title: 'Clean' } })
  })
  it('update', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await api.update(1, { status: 'completed' })
    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/1', { task: { status: 'completed' } })
  })
  it('destroy', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/1')
  })
})
