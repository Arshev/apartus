import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as rolesApi from '../api/roles'

export const useRolesStore = defineStore('roles', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await rolesApi.list()
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить роли'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const role = await rolesApi.create(data)
      items.value.push(role)
      return role
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать роль'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const role = await rolesApi.update(id, data)
      const idx = items.value.findIndex((r) => r.id === id)
      if (idx !== -1) items.value[idx] = role
      return role
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить роль'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await rolesApi.destroy(id)
      items.value = items.value.filter((r) => r.id !== id)
    } catch (e) {
      const status = e.response?.status
      if (status === 403) {
        error.value = 'Системную роль нельзя удалить'
      } else {
        error.value = e.response?.data?.error || 'Не удалось удалить роль'
      }
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy }
})
