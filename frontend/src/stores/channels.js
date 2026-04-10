import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as channelsApi from '../api/channels'

export const useChannelsStore = defineStore('channels', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await channelsApi.list()
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Не удалось загрузить каналы'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const ch = await channelsApi.create(data)
      items.value.push(ch)
      return ch
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Не удалось создать канал'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const ch = await channelsApi.update(id, data)
      const idx = items.value.findIndex((c) => c.id === id)
      if (idx !== -1) items.value[idx] = ch
      return ch
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Не удалось обновить канал'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await channelsApi.destroy(id)
      items.value = items.value.filter((c) => c.id !== id)
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Не удалось удалить канал'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function syncChannel(id) {
    error.value = null
    try {
      const ch = await channelsApi.sync(id)
      const idx = items.value.findIndex((c) => c.id === id)
      if (idx !== -1) items.value[idx] = ch
      return ch
    } catch (e) {
      console.error(e)
      error.value = e.response?.data?.error || 'Ошибка синхронизации'
      throw e
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy, syncChannel }
})
