import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/expenses', () => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import * as api from '../../api/expenses'
import { useExpensesStore } from '../../stores/expenses'

const E1 = { id: 1, category: 'cleaning', amount_cents: 5000 }
const E2 = { id: 2, category: 'utilities', amount_cents: 8000 }

describe('useExpensesStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll', async () => {
    api.list.mockResolvedValue([E1, E2])
    const store = useExpensesStore()
    await store.fetchAll()
    expect(store.items).toEqual([E1, E2])
  })

  it('fetchAll error', async () => {
    api.list.mockRejectedValue({ response: { data: { error: 'fail' } } })
    const store = useExpensesStore()
    await store.fetchAll()
    expect(store.error).toBe('fail')
  })

  it('create appends', async () => {
    api.create.mockResolvedValue(E1)
    const store = useExpensesStore()
    await store.create({ amount_cents: 5000 })
    expect(store.items).toContainEqual(E1)
  })

  it('update replaces', async () => {
    api.list.mockResolvedValue([E1])
    api.update.mockResolvedValue({ ...E1, amount_cents: 6000 })
    const store = useExpensesStore()
    await store.fetchAll()
    await store.update(1, { amount_cents: 6000 })
    expect(store.items[0].amount_cents).toBe(6000)
  })

  it('destroy removes', async () => {
    api.list.mockResolvedValue([E1, E2])
    api.destroy.mockResolvedValue({})
    const store = useExpensesStore()
    await store.fetchAll()
    await store.destroy(1)
    expect(store.items).toEqual([E2])
  })
})
