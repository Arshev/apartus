import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/allUnits'

describe('api/allUnits', () => {
  it('list calls GET /all_units', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list()
    expect(apiClient.get).toHaveBeenCalledWith('/all_units')
  })
})
