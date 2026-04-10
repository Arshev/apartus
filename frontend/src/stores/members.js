import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as membersApi from '../api/members'

export const useMembersStore = defineStore('members', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await membersApi.list()
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить участников'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const member = await membersApi.create(data)
      items.value.push(member)
      return member
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось добавить участника'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const member = await membersApi.update(id, data)
      const idx = items.value.findIndex((m) => m.id === id)
      if (idx !== -1) items.value[idx] = member
      return member
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить участника'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await membersApi.destroy(id)
      items.value = items.value.filter((m) => m.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить участника'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy }
})
