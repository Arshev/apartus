import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/seasonalPrices'

describe('api/seasonalPrices', () => {
  it('list', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list(5)
    expect(apiClient.get).toHaveBeenCalledWith('/units/5/seasonal_prices')
  })
  it('create', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await api.create(5, { start_date: '2026-06-01', end_date: '2026-08-31', price_cents: 8000 })
    expect(apiClient.post).toHaveBeenCalledWith('/units/5/seasonal_prices', {
      seasonal_price: { start_date: '2026-06-01', end_date: '2026-08-31', price_cents: 8000 },
    })
  })
  it('update', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await api.update(5, 1, { price_cents: 9000 })
    expect(apiClient.patch).toHaveBeenCalledWith('/units/5/seasonal_prices/1', {
      seasonal_price: { price_cents: 9000 },
    })
  })
  it('destroy', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.destroy(5, 1)
    expect(apiClient.delete).toHaveBeenCalledWith('/units/5/seasonal_prices/1')
  })
})
