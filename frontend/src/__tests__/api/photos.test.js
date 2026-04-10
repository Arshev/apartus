import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/photos'

describe('api/photos', () => {
  it('listPropertyPhotos', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.listPropertyPhotos(1)
    expect(apiClient.get).toHaveBeenCalledWith('/properties/1/photos')
  })

  it('uploadPropertyPhotos sends FormData', async () => {
    apiClient.post.mockResolvedValue({ data: [{ id: 1 }] })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    await api.uploadPropertyPhotos(1, [file])
    expect(apiClient.post).toHaveBeenCalledWith(
      '/properties/1/photos',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  })

  it('deletePropertyPhoto', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.deletePropertyPhoto(1, 5)
    expect(apiClient.delete).toHaveBeenCalledWith('/properties/1/photos/5')
  })

  it('listUnitPhotos', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.listUnitPhotos(3)
    expect(apiClient.get).toHaveBeenCalledWith('/units/3/photos')
  })

  it('uploadUnitPhotos', async () => {
    apiClient.post.mockResolvedValue({ data: [{ id: 1 }] })
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    await api.uploadUnitPhotos(3, [file])
    expect(apiClient.post).toHaveBeenCalledWith(
      '/units/3/photos',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  })

  it('deleteUnitPhoto', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.deleteUnitPhoto(3, 7)
    expect(apiClient.delete).toHaveBeenCalledWith('/units/3/photos/7')
  })
})
