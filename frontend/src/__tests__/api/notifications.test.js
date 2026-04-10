import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/notifications'

describe('api/notifications', () => {
  it('list calls GET /reservations/:id/notifications', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list(5)
    expect(apiClient.get).toHaveBeenCalledWith('/reservations/5/notifications')
  })
})
