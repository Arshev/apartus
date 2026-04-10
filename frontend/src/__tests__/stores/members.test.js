import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/members', () => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import * as membersApi from '../../api/members'
import { useMembersStore } from '../../stores/members'

const M1 = { id: 1, user: { id: 1, full_name: 'A' }, role: 'owner' }
const M2 = { id: 2, user: { id: 2, full_name: 'B' }, role: 'member' }

describe('useMembersStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll populates', async () => {
    membersApi.list.mockResolvedValue([M1, M2])
    const store = useMembersStore()
    await store.fetchAll()
    expect(store.items).toEqual([M1, M2])
  })

  it('fetchAll error', async () => {
    membersApi.list.mockRejectedValue({ response: { data: { error: 'fail' } } })
    const store = useMembersStore()
    await store.fetchAll()
    expect(store.error).toBe('fail')
  })

  it('create appends', async () => {
    membersApi.create.mockResolvedValue(M1)
    const store = useMembersStore()
    await store.create({ email: 'a@b.c' })
    expect(store.items).toContainEqual(M1)
  })

  it('update replaces', async () => {
    membersApi.list.mockResolvedValue([M1])
    membersApi.update.mockResolvedValue({ ...M1, role: 'manager' })
    const store = useMembersStore()
    await store.fetchAll()
    await store.update(1, { role_enum: 'manager' })
    expect(store.items[0].role).toBe('manager')
  })

  it('destroy removes', async () => {
    membersApi.list.mockResolvedValue([M1, M2])
    membersApi.destroy.mockResolvedValue({})
    const store = useMembersStore()
    await store.fetchAll()
    await store.destroy(2)
    expect(store.items).toEqual([M1])
  })
})
