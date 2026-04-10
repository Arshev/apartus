import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/dashboard'

describe('api/dashboard', () => {
  it('get calls GET /dashboard', async () => {
    apiClient.get.mockResolvedValue({ data: { total_units: 5 } })
    const result = await api.get()
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard')
    expect(result.total_units).toBe(5)
  })
})
