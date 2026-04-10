import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as guestsApi from '../api/guests'

export const useGuestsStore = defineStore('guests', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await guestsApi.list()
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить гостей'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const guest = await guestsApi.create(data)
      items.value.push(guest)
      return guest
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать гостя'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const guest = await guestsApi.update(id, data)
      const idx = items.value.findIndex((g) => g.id === id)
      if (idx !== -1) items.value[idx] = guest
      return guest
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить гостя'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await guestsApi.destroy(id)
      items.value = items.value.filter((g) => g.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить гостя'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy }
})
