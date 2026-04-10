import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as propertiesApi from '../api/properties'

export const usePropertiesStore = defineStore('properties', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await propertiesApi.list()
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить объекты'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const property = await propertiesApi.create(data)
      items.value.push(property)
      return property
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать объект'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const property = await propertiesApi.update(id, data)
      const idx = items.value.findIndex((p) => p.id === id)
      if (idx !== -1) items.value[idx] = property
      return property
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить объект'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await propertiesApi.destroy(id)
      items.value = items.value.filter((p) => p.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить объект'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy }
})
