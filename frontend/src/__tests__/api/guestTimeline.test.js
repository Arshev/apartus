import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/guestTimeline'

describe('api/guestTimeline', () => {
  it('get calls GET /guests/:id/timeline', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.get(5)
    expect(apiClient.get).toHaveBeenCalledWith('/guests/5/timeline')
  })
})
