import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/amenities', () => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import * as amenitiesApi from '../../api/amenities'
import { useAmenitiesStore } from '../../stores/amenities'

const A1 = { id: 1, name: 'WiFi' }
const A2 = { id: 2, name: 'Pool' }

describe('useAmenitiesStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll populates items', async () => {
    amenitiesApi.list.mockResolvedValue([A1, A2])
    const store = useAmenitiesStore()
    await store.fetchAll()
    expect(store.items).toEqual([A1, A2])
  })

  it('create appends', async () => {
    amenitiesApi.create.mockResolvedValue(A1)
    const store = useAmenitiesStore()
    await store.create({ name: 'WiFi' })
    expect(store.items).toContainEqual(A1)
  })

  it('update replaces', async () => {
    amenitiesApi.list.mockResolvedValue([A1])
    amenitiesApi.update.mockResolvedValue({ ...A1, name: 'Fast WiFi' })
    const store = useAmenitiesStore()
    await store.fetchAll()
    await store.update(1, { name: 'Fast WiFi' })
    expect(store.items[0].name).toBe('Fast WiFi')
  })

  it('destroy removes', async () => {
    amenitiesApi.list.mockResolvedValue([A1, A2])
    amenitiesApi.destroy.mockResolvedValue({})
    const store = useAmenitiesStore()
    await store.fetchAll()
    await store.destroy(1)
    expect(store.items).toEqual([A2])
  })

  it('destroy 409 sets specific error (FM-01)', async () => {
    amenitiesApi.destroy.mockRejectedValue({ response: { status: 409, data: {} } })
    const store = useAmenitiesStore()
    await expect(store.destroy(1)).rejects.toBeDefined()
    expect(store.error).toBe('Удалите привязки к помещениям перед удалением')
  })
})
