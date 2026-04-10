import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

import apiClient from '../../api/client'
import * as branchesApi from '../../api/branches'

describe('api/branches', () => {
  it('list calls GET /branches', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, name: 'HQ' }] })
    const result = await branchesApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/branches')
    expect(result).toEqual([{ id: 1, name: 'HQ' }])
  })
})
