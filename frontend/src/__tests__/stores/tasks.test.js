import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/tasks', () => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import * as api from '../../api/tasks'
import { useTasksStore } from '../../stores/tasks'

const T1 = { id: 1, title: 'Clean', status: 'pending', priority: 'high' }
const T2 = { id: 2, title: 'Fix', status: 'in_progress', priority: 'medium' }
const T3 = { id: 3, title: 'Inspect', status: 'completed', priority: 'low' }

describe('useTasksStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll + computed columns', async () => {
    api.list.mockResolvedValue([T1, T2, T3])
    const store = useTasksStore()
    await store.fetchAll()
    expect(store.pending).toEqual([T1])
    expect(store.inProgress).toEqual([T2])
    expect(store.completed).toEqual([T3])
  })

  it('create', async () => {
    api.create.mockResolvedValue(T1)
    const store = useTasksStore()
    await store.create({ title: 'Clean' })
    expect(store.items).toContainEqual(T1)
  })

  it('update', async () => {
    api.list.mockResolvedValue([T1])
    api.update.mockResolvedValue({ ...T1, status: 'in_progress' })
    const store = useTasksStore()
    await store.fetchAll()
    await store.update(1, { status: 'in_progress' })
    expect(store.items[0].status).toBe('in_progress')
  })

  it('destroy', async () => {
    api.list.mockResolvedValue([T1, T2])
    api.destroy.mockResolvedValue({})
    const store = useTasksStore()
    await store.fetchAll()
    await store.destroy(1)
    expect(store.items).toEqual([T2])
  })
})
