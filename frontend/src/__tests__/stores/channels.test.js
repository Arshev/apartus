import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/channels', () => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(), sync: vi.fn(),
}))

import * as api from '../../api/channels'
import { useChannelsStore } from '../../stores/channels'

const C1 = { id: 1, platform: 'airbnb', unit_name: 'R1' }
const C2 = { id: 2, platform: 'booking_com', unit_name: 'R2' }

describe('useChannelsStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll populates', async () => {
    api.list.mockResolvedValue([C1, C2])
    const store = useChannelsStore()
    await store.fetchAll()
    expect(store.items).toEqual([C1, C2])
  })

  it('fetchAll error', async () => {
    api.list.mockRejectedValue({ response: { data: { error: 'fail' } } })
    const store = useChannelsStore()
    await store.fetchAll()
    expect(store.error).toBe('fail')
  })

  it('create appends', async () => {
    api.create.mockResolvedValue(C1)
    const store = useChannelsStore()
    await store.create({ unit_id: 1, platform: 'airbnb' })
    expect(store.items).toContainEqual(C1)
  })

  it('update replaces', async () => {
    api.list.mockResolvedValue([C1])
    api.update.mockResolvedValue({ ...C1, sync_enabled: false })
    const store = useChannelsStore()
    await store.fetchAll()
    await store.update(1, { sync_enabled: false })
    expect(store.items[0].sync_enabled).toBe(false)
  })

  it('destroy removes', async () => {
    api.list.mockResolvedValue([C1, C2])
    api.destroy.mockResolvedValue({})
    const store = useChannelsStore()
    await store.fetchAll()
    await store.destroy(1)
    expect(store.items).toEqual([C2])
  })

  it('syncChannel updates item', async () => {
    api.list.mockResolvedValue([C1])
    api.sync.mockResolvedValue({ ...C1, last_synced_at: '2026-04-11' })
    const store = useChannelsStore()
    await store.fetchAll()
    await store.syncChannel(1)
    expect(store.items[0].last_synced_at).toBe('2026-04-11')
  })

  it('syncChannel error', async () => {
    api.sync.mockRejectedValue({ response: { data: { error: 'no url' } } })
    const store = useChannelsStore()
    await expect(store.syncChannel(1)).rejects.toBeDefined()
    expect(store.error).toBe('no url')
  })
})
