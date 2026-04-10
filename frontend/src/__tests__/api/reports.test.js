import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/reports'

describe('api/reports', () => {
  it('financial', async () => {
    apiClient.get.mockResolvedValue({ data: { total_revenue: 100000 } })
    const result = await api.financial({ from: '2026-04-01', to: '2026-04-30' })
    expect(apiClient.get).toHaveBeenCalledWith('/reports/financial', { params: { from: '2026-04-01', to: '2026-04-30' } })
    expect(result.total_revenue).toBe(100000)
  })
})
