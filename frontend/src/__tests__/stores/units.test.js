import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/units', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import * as unitsApi from '../../api/units'
import { useUnitsStore } from '../../stores/units'

const U1 = { id: 1, name: 'R101', unit_type: 'room', capacity: 2, status: 'available' }
const U2 = { id: 2, name: 'R102', unit_type: 'room', capacity: 3, status: 'maintenance' }

describe('useUnitsStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll populates items scoped to propertyId', async () => {
    unitsApi.list.mockResolvedValue([U1, U2])
    const store = useUnitsStore()
    await store.fetchAll(10)
    expect(unitsApi.list).toHaveBeenCalledWith(10)
    expect(store.items).toEqual([U1, U2])
    expect(store.propertyId).toBe(10)
  })

  it('fetchAll error sets store.error', async () => {
    unitsApi.list.mockRejectedValue({ response: { data: { error: 'fail' } } })
    const store = useUnitsStore()
    await store.fetchAll(10)
    expect(store.error).toBe('fail')
    expect(store.items).toEqual([])
  })

  it('create appends to items', async () => {
    unitsApi.create.mockResolvedValue(U1)
    const store = useUnitsStore()
    store.propertyId = 10
    await store.create({ name: 'R101' })
    expect(unitsApi.create).toHaveBeenCalledWith(10, { name: 'R101' })
    expect(store.items).toContainEqual(U1)
  })

  it('update replaces in items', async () => {
    unitsApi.list.mockResolvedValue([U1])
    unitsApi.update.mockResolvedValue({ ...U1, name: 'Updated' })
    const store = useUnitsStore()
    await store.fetchAll(10)
    await store.update(1, { name: 'Updated' })
    expect(store.items[0].name).toBe('Updated')
  })

  it('destroy removes from items', async () => {
    unitsApi.list.mockResolvedValue([U1, U2])
    unitsApi.destroy.mockResolvedValue({})
    const store = useUnitsStore()
    await store.fetchAll(10)
    await store.destroy(1)
    expect(store.items).toEqual([U2])
  })

  it('destroy error sets store.error (FM-03)', async () => {
    unitsApi.destroy.mockRejectedValue({ response: { data: { error: 'Not found' } } })
    const store = useUnitsStore()
    await expect(store.destroy(99)).rejects.toBeDefined()
    expect(store.error).toBe('Not found')
  })
})
