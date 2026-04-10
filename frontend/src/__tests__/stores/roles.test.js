import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/roles', () => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import * as rolesApi from '../../api/roles'
import { useRolesStore } from '../../stores/roles'

const R1 = { id: 1, name: 'Admin', code: 'admin', is_system: true }
const R2 = { id: 2, name: 'Custom', code: 'custom', is_system: false }

describe('useRolesStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll populates', async () => {
    rolesApi.list.mockResolvedValue([R1, R2])
    const store = useRolesStore()
    await store.fetchAll()
    expect(store.items).toEqual([R1, R2])
  })

  it('create appends', async () => {
    rolesApi.create.mockResolvedValue(R2)
    const store = useRolesStore()
    await store.create({ name: 'Custom' })
    expect(store.items).toContainEqual(R2)
  })

  it('update replaces', async () => {
    rolesApi.list.mockResolvedValue([R2])
    rolesApi.update.mockResolvedValue({ ...R2, name: 'Updated' })
    const store = useRolesStore()
    await store.fetchAll()
    await store.update(2, { name: 'Updated' })
    expect(store.items[0].name).toBe('Updated')
  })

  it('destroy removes', async () => {
    rolesApi.list.mockResolvedValue([R1, R2])
    rolesApi.destroy.mockResolvedValue({})
    const store = useRolesStore()
    await store.fetchAll()
    await store.destroy(2)
    expect(store.items).toEqual([R1])
  })

  it('destroy 403 sets system role error', async () => {
    rolesApi.destroy.mockRejectedValue({ response: { status: 403, data: {} } })
    const store = useRolesStore()
    await expect(store.destroy(1)).rejects.toBeDefined()
    expect(store.error).toBe('Системную роль нельзя удалить')
  })
})
