import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as guestsApi from '../../api/guests'

describe('api/guests', () => {
  it('list', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await guestsApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/guests')
  })
  it('get', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1 } })
    await guestsApi.get(1)
    expect(apiClient.get).toHaveBeenCalledWith('/guests/1')
  })
  it('create', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await guestsApi.create({ first_name: 'A' })
    expect(apiClient.post).toHaveBeenCalledWith('/guests', { guest: { first_name: 'A' } })
  })
  it('update', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await guestsApi.update(1, { first_name: 'B' })
    expect(apiClient.patch).toHaveBeenCalledWith('/guests/1', { guest: { first_name: 'B' } })
  })
  it('destroy', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await guestsApi.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/guests/1')
  })
})
