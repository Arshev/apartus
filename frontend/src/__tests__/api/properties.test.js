import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import apiClient from '../../api/client'
import * as propertiesApi from '../../api/properties'

const PROPERTY = { id: 1, name: 'Test', address: '123 St', property_type: 'apartment' }

describe('api/properties', () => {
  it('list calls GET /properties', async () => {
    apiClient.get.mockResolvedValue({ data: [PROPERTY] })
    const result = await propertiesApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/properties')
    expect(result).toEqual([PROPERTY])
  })

  it('get calls GET /properties/:id', async () => {
    apiClient.get.mockResolvedValue({ data: PROPERTY })
    const result = await propertiesApi.get(1)
    expect(apiClient.get).toHaveBeenCalledWith('/properties/1')
    expect(result).toEqual(PROPERTY)
  })

  it('create calls POST /properties with wrapped body', async () => {
    apiClient.post.mockResolvedValue({ data: PROPERTY })
    const data = { name: 'Test', address: '123 St', property_type: 'apartment' }
    await propertiesApi.create(data)
    expect(apiClient.post).toHaveBeenCalledWith('/properties', { property: data })
  })

  it('update calls PATCH /properties/:id', async () => {
    apiClient.patch.mockResolvedValue({ data: PROPERTY })
    await propertiesApi.update(1, { name: 'Updated' })
    expect(apiClient.patch).toHaveBeenCalledWith('/properties/1', { property: { name: 'Updated' } })
  })

  it('destroy calls DELETE /properties/:id', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await propertiesApi.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/properties/1')
  })
})
