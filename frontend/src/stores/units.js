import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as unitsApi from '../api/units'

export const useUnitsStore = defineStore('units', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  const propertyId = ref(null)

  async function fetchAll(pid) {
    propertyId.value = pid
    loading.value = true
    error.value = null
    try {
      items.value = await unitsApi.list(pid)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить помещения'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const unit = await unitsApi.create(propertyId.value, data)
      items.value.push(unit)
      return unit
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать помещение'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const unit = await unitsApi.update(propertyId.value, id, data)
      const idx = items.value.findIndex((u) => u.id === id)
      if (idx !== -1) items.value[idx] = unit
      return unit
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить помещение'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await unitsApi.destroy(propertyId.value, id)
      items.value = items.value.filter((u) => u.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить помещение'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, propertyId, fetchAll, create, update, destroy }
})
