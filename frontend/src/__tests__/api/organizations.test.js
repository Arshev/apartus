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
  it('get calls GET /organization (singular, current org)', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1 } })
    await orgApi.get()
    expect(apiClient.get).toHaveBeenCalledWith('/organization')
  })
  it('update calls PATCH /organization (singular)', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await orgApi.update({ name: 'New' })
    expect(apiClient.patch).toHaveBeenCalledWith('/organization', { organization: { name: 'New' } })
  })
})
