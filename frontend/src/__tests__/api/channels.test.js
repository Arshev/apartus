import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/channels'

describe('api/channels', () => {
  it('list', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list()
    expect(apiClient.get).toHaveBeenCalledWith('/channels')
  })
  it('create', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await api.create({ unit_id: 1, platform: 'airbnb' })
    expect(apiClient.post).toHaveBeenCalledWith('/channels', { channel: { unit_id: 1, platform: 'airbnb' } })
  })
  it('update', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await api.update(1, { ical_import_url: 'https://example.com' })
    expect(apiClient.patch).toHaveBeenCalledWith('/channels/1', { channel: { ical_import_url: 'https://example.com' } })
  })
  it('destroy', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/channels/1')
  })
  it('sync', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1, last_synced_at: '2026-04-10' } })
    await api.sync(1)
    expect(apiClient.post).toHaveBeenCalledWith('/channels/1/sync')
  })
})
