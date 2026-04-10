import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}))

import apiClient from '../../api/client'
import * as orgApi from '../../api/organizations'

describe('api/organizations', () => {
  it('list calls GET /organizations', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await orgApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/organizations')
  })
  it('get calls GET /organizations/:id', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1 } })
    await orgApi.get(1)
    expect(apiClient.get).toHaveBeenCalledWith('/organizations/1')
  })
  it('update calls PATCH with wrapped body', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await orgApi.update(1, { name: 'New' })
    expect(apiClient.patch).toHaveBeenCalledWith('/organizations/1', { organization: { name: 'New' } })
  })
})
