import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as unitAmenitiesApi from '../../api/unitAmenities'

describe('api/unitAmenities', () => {
  it('list calls GET /units/:uid/amenities', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, name: 'WiFi' }] })
    const result = await unitAmenitiesApi.list(5)
    expect(apiClient.get).toHaveBeenCalledWith('/units/5/amenities')
    expect(result).toEqual([{ id: 1, name: 'WiFi' }])
  })

  it('attach calls POST /units/:uid/amenities with body', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await unitAmenitiesApi.attach(5, 3)
    expect(apiClient.post).toHaveBeenCalledWith('/units/5/amenities', {
      unit_amenity: { amenity_id: 3 },
    })
  })

  it('detach calls DELETE /units/:uid/amenities/:id', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await unitAmenitiesApi.detach(5, 3)
    expect(apiClient.delete).toHaveBeenCalledWith('/units/5/amenities/3')
  })
})
