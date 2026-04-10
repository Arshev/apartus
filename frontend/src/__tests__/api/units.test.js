import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as unitsApi from '../../api/units'

describe('api/units', () => {
  it('list calls GET /properties/:pid/units', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await unitsApi.list(10)
    expect(apiClient.get).toHaveBeenCalledWith('/properties/10/units')
  })

  it('get calls GET /properties/:pid/units/:id', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1 } })
    await unitsApi.get(10, 1)
    expect(apiClient.get).toHaveBeenCalledWith('/properties/10/units/1')
  })

  it('create wraps body in { unit: data }', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await unitsApi.create(10, { name: 'R1' })
    expect(apiClient.post).toHaveBeenCalledWith('/properties/10/units', { unit: { name: 'R1' } })
  })

  it('update calls PATCH', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await unitsApi.update(10, 1, { name: 'R2' })
    expect(apiClient.patch).toHaveBeenCalledWith('/properties/10/units/1', { unit: { name: 'R2' } })
  })

  it('destroy calls DELETE', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await unitsApi.destroy(10, 1)
    expect(apiClient.delete).toHaveBeenCalledWith('/properties/10/units/1')
  })
})
