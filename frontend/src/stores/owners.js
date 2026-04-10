import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as ownersApi from '../api/owners'

export const useOwnersStore = defineStore('owners', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await ownersApi.list()
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Не удалось загрузить собственников'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const o = await ownersApi.create(data)
      items.value.push(o)
      return o
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Не удалось создать'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const o = await ownersApi.update(id, data)
      const idx = items.value.findIndex((i) => i.id === id)
      if (idx !== -1) items.value[idx] = o
      return o
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Не удалось обновить'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await ownersApi.destroy(id)
      items.value = items.value.filter((i) => i.id !== id)
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Не удалось удалить'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy }
})
