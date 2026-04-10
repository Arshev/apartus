import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/guests', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import * as guestsApi from '../../api/guests'
import { useGuestsStore } from '../../stores/guests'

const G1 = { id: 1, first_name: 'Alice', last_name: 'Smith' }
const G2 = { id: 2, first_name: 'Bob', last_name: 'Jones' }

describe('useGuestsStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll populates', async () => {
    guestsApi.list.mockResolvedValue([G1, G2])
    const store = useGuestsStore()
    await store.fetchAll()
    expect(store.items).toEqual([G1, G2])
  })

  it('fetchAll error', async () => {
    guestsApi.list.mockRejectedValue({ response: { data: { error: 'fail' } } })
    const store = useGuestsStore()
    await store.fetchAll()
    expect(store.error).toBe('fail')
  })

  it('create appends', async () => {
    guestsApi.create.mockResolvedValue(G1)
    const store = useGuestsStore()
    await store.create({ first_name: 'Alice' })
    expect(store.items).toContainEqual(G1)
  })

  it('create error', async () => {
    guestsApi.create.mockRejectedValue({ response: { data: { error: ['dup'] } } })
    const store = useGuestsStore()
    await expect(store.create({})).rejects.toBeDefined()
    expect(store.error).toEqual(['dup'])
  })

  it('update replaces', async () => {
    guestsApi.list.mockResolvedValue([G1])
    guestsApi.update.mockResolvedValue({ ...G1, first_name: 'Updated' })
    const store = useGuestsStore()
    await store.fetchAll()
    await store.update(1, { first_name: 'Updated' })
    expect(store.items[0].first_name).toBe('Updated')
  })

  it('destroy removes', async () => {
    guestsApi.list.mockResolvedValue([G1, G2])
    guestsApi.destroy.mockResolvedValue({})
    const store = useGuestsStore()
    await store.fetchAll()
    await store.destroy(1)
    expect(store.items).toEqual([G2])
  })
})
