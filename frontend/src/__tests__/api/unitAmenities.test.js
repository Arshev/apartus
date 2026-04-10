import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { post: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as unitAmenitiesApi from '../../api/unitAmenities'

describe('api/unitAmenities', () => {
  it('attach calls POST /units/:uid/amenities/:id', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await unitAmenitiesApi.attach(5, 3)
    expect(apiClient.post).toHaveBeenCalledWith('/units/5/amenities/3')
  })
  it('detach calls DELETE /units/:uid/amenities/:id', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await unitAmenitiesApi.detach(5, 3)
    expect(apiClient.delete).toHaveBeenCalledWith('/units/5/amenities/3')
  })
})
