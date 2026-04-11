import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/owners', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(), statement: vi.fn(),
}))

import * as api from '../../api/owners'
import { useOwnersStore } from '../../stores/owners'

const O1 = { id: 1, name: 'Иванов', commission_rate: 1500 }
const O2 = { id: 2, name: 'Петрова', commission_rate: 2000 }

describe('useOwnersStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll', async () => {
    api.list.mockResolvedValue([O1, O2])
    const store = useOwnersStore()
    await store.fetchAll()
    expect(store.items).toEqual([O1, O2])
  })

  it('fetchAll error', async () => {
    api.list.mockRejectedValue({ response: { data: { error: 'fail' } } })
    const store = useOwnersStore()
    await store.fetchAll()
    expect(store.error).toBe('fail')
  })

  it('create', async () => {
    api.create.mockResolvedValue(O1)
    const store = useOwnersStore()
    await store.create({ name: 'Иванов' })
    expect(store.items).toContainEqual(O1)
  })

  it('update', async () => {
    api.list.mockResolvedValue([O1])
    api.update.mockResolvedValue({ ...O1, name: 'Updated' })
    const store = useOwnersStore()
    await store.fetchAll()
    await store.update(1, { name: 'Updated' })
    expect(store.items[0].name).toBe('Updated')
  })

  it('destroy', async () => {
    api.list.mockResolvedValue([O1, O2])
    api.destroy.mockResolvedValue({})
    const store = useOwnersStore()
    await store.fetchAll()
    await store.destroy(1)
    expect(store.items).toEqual([O2])
  })
})
