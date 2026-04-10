import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/branches', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
}))

import * as branchesApi from '../../api/branches'
import { useBranchesStore, buildTree } from '../../stores/branches'

const B1 = { id: 1, name: 'HQ', parent_branch_id: null }
const B2 = { id: 2, name: 'North', parent_branch_id: 1 }
const B3 = { id: 3, name: 'South', parent_branch_id: 1 }
const B4 = { id: 4, name: 'North-East', parent_branch_id: 2 }

describe('buildTree', () => {
  it('builds nested structure from flat list', () => {
    const tree = buildTree([B1, B2, B3, B4])
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('HQ')
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].name).toBe('North')
    expect(tree[0].children[0].children).toHaveLength(1)
    expect(tree[0].children[0].children[0].name).toBe('North-East')
    expect(tree[0].children[1].name).toBe('South')
    expect(tree[0].children[1].children).toHaveLength(0)
  })

  it('handles empty list', () => {
    expect(buildTree([])).toEqual([])
  })

  it('handles multiple roots', () => {
    const tree = buildTree([B1, { id: 5, name: 'Standalone', parent_branch_id: null }])
    expect(tree).toHaveLength(2)
  })

  it('handles orphan (parent_branch_id references non-existent) as root', () => {
    const tree = buildTree([{ id: 10, name: 'Orphan', parent_branch_id: 999 }])
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('Orphan')
  })
})

describe('useBranchesStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll populates items and tree computed', async () => {
    branchesApi.list.mockResolvedValue([B1, B2])
    const store = useBranchesStore()
    await store.fetchAll()
    expect(store.items).toEqual([B1, B2])
    expect(store.tree).toHaveLength(1)
    expect(store.tree[0].children).toHaveLength(1)
  })

  it('create appends', async () => {
    branchesApi.create.mockResolvedValue(B1)
    const store = useBranchesStore()
    await store.create({ name: 'HQ' })
    expect(store.items).toContainEqual(B1)
  })

  it('update replaces', async () => {
    branchesApi.list.mockResolvedValue([B1])
    branchesApi.update.mockResolvedValue({ ...B1, name: 'Main' })
    const store = useBranchesStore()
    await store.fetchAll()
    await store.update(1, { name: 'Main' })
    expect(store.items[0].name).toBe('Main')
  })

  it('destroy removes', async () => {
    branchesApi.list.mockResolvedValue([B1, B2])
    branchesApi.destroy.mockResolvedValue({})
    const store = useBranchesStore()
    await store.fetchAll()
    await store.destroy(2)
    expect(store.items).toEqual([B1])
  })

  it('destroy error on 422 (FM-02)', async () => {
    branchesApi.destroy.mockRejectedValue({ response: { data: { error: ['Has children'] } } })
    const store = useBranchesStore()
    await expect(store.destroy(1)).rejects.toBeDefined()
    expect(store.error).toEqual(['Has children'])
  })
})
