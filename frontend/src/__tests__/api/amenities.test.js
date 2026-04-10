import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as amenitiesApi from '../../api/amenities'

describe('api/amenities', () => {
  it('list calls GET /amenities', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await amenitiesApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/amenities')
  })
  it('create wraps in { amenity }', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await amenitiesApi.create({ name: 'WiFi' })
    expect(apiClient.post).toHaveBeenCalledWith('/amenities', { amenity: { name: 'WiFi' } })
  })
  it('update calls PATCH', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await amenitiesApi.update(1, { name: 'Pool' })
    expect(apiClient.patch).toHaveBeenCalledWith('/amenities/1', { amenity: { name: 'Pool' } })
  })
  it('destroy calls DELETE', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await amenitiesApi.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/amenities/1')
  })
})
