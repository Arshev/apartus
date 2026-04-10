import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/expenses'

describe('api/expenses', () => {
  it('list', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list({ category: 'cleaning' })
    expect(apiClient.get).toHaveBeenCalledWith('/expenses', { params: { category: 'cleaning' } })
  })
  it('create', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await api.create({ amount_cents: 5000 })
    expect(apiClient.post).toHaveBeenCalledWith('/expenses', { expense: { amount_cents: 5000 } })
  })
  it('update', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await api.update(1, { amount_cents: 6000 })
    expect(apiClient.patch).toHaveBeenCalledWith('/expenses/1', { expense: { amount_cents: 6000 } })
  })
  it('destroy', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/expenses/1')
  })
})
