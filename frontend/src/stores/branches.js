import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as branchesApi from '../api/branches'

export function buildTree(flatItems) {
  const map = {}
  const roots = []
  flatItems.forEach((item) => { map[item.id] = { ...item, children: [] } })
  flatItems.forEach((item) => {
    const node = map[item.id]
    if (item.parent_branch_id && map[item.parent_branch_id]) {
      map[item.parent_branch_id].children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export const useBranchesStore = defineStore('branches', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  const tree = computed(() => buildTree(items.value))

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await branchesApi.list()
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить филиалы'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const branch = await branchesApi.create(data)
      items.value.push(branch)
      return branch
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать филиал'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const branch = await branchesApi.update(id, data)
      const idx = items.value.findIndex((b) => b.id === id)
      if (idx !== -1) items.value[idx] = branch
      return branch
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить филиал'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await branchesApi.destroy(id)
      items.value = items.value.filter((b) => b.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить филиал'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, tree, fetchAll, create, update, destroy }
})
