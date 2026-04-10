import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as amenitiesApi from '../api/amenities'

export const useAmenitiesStore = defineStore('amenities', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await amenitiesApi.list()
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить удобства'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const amenity = await amenitiesApi.create(data)
      items.value.push(amenity)
      return amenity
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать удобство'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const amenity = await amenitiesApi.update(id, data)
      const idx = items.value.findIndex((a) => a.id === id)
      if (idx !== -1) items.value[idx] = amenity
      return amenity
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить удобство'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await amenitiesApi.destroy(id)
      items.value = items.value.filter((a) => a.id !== id)
    } catch (e) {
      const status = e.response?.status
      if (status === 409) {
        error.value = 'Удалите привязки к помещениям перед удалением'
      } else {
        error.value = e.response?.data?.error || 'Не удалось удалить удобство'
      }
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy }
})
