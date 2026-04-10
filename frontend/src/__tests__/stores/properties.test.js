import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/properties', () => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
}))

import * as propertiesApi from '../../api/properties'
import { usePropertiesStore } from '../../stores/properties'

const P1 = { id: 1, name: 'A', address: '1 St', property_type: 'apartment' }
const P2 = { id: 2, name: 'B', address: '2 St', property_type: 'hotel' }

describe('usePropertiesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchAll', () => {
    it('populates items on success', async () => {
      propertiesApi.list.mockResolvedValue([P1, P2])
      const store = usePropertiesStore()
      await store.fetchAll()
      expect(store.items).toEqual([P1, P2])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets error on failure (NEG-01)', async () => {
      propertiesApi.list.mockRejectedValue({ response: { data: { error: 'fail' } } })
      const store = usePropertiesStore()
      await store.fetchAll()
      expect(store.error).toBe('fail')
      expect(store.items).toEqual([])
      expect(store.loading).toBe(false)
    })
  })

  describe('create', () => {
    it('appends new property to items', async () => {
      propertiesApi.create.mockResolvedValue(P1)
      const store = usePropertiesStore()
      const result = await store.create({ name: 'A' })
      expect(result).toEqual(P1)
      expect(store.items).toContainEqual(P1)
    })

    it('sets error on 422 (FM-02)', async () => {
      propertiesApi.create.mockRejectedValue({ response: { data: { error: ['Name required'] } } })
      const store = usePropertiesStore()
      await expect(store.create({})).rejects.toBeDefined()
      expect(store.error).toEqual(['Name required'])
    })
  })

  describe('update', () => {
    it('replaces property in items', async () => {
      propertiesApi.list.mockResolvedValue([P1])
      const updated = { ...P1, name: 'Updated' }
      propertiesApi.update.mockResolvedValue(updated)
      const store = usePropertiesStore()
      await store.fetchAll()
      await store.update(1, { name: 'Updated' })
      expect(store.items[0].name).toBe('Updated')
    })
  })

  describe('destroy', () => {
    it('removes property from items', async () => {
      propertiesApi.list.mockResolvedValue([P1, P2])
      propertiesApi.destroy.mockResolvedValue({})
      const store = usePropertiesStore()
      await store.fetchAll()
      await store.destroy(1)
      expect(store.items).toEqual([P2])
    })

    it('sets error on 404 (NEG-02 / FM-03)', async () => {
      propertiesApi.destroy.mockRejectedValue({ response: { data: { error: 'Not found' } } })
      const store = usePropertiesStore()
      await expect(store.destroy(99)).rejects.toBeDefined()
      expect(store.error).toBe('Not found')
    })
  })

  describe('loading state', () => {
    it('toggles loading during fetchAll', async () => {
      let resolve
      propertiesApi.list.mockImplementation(() => new Promise((r) => { resolve = r }))
      const store = usePropertiesStore()
      const p = store.fetchAll()
      expect(store.loading).toBe(true)
      resolve([])
      await p
      expect(store.loading).toBe(false)
    })
  })
})
