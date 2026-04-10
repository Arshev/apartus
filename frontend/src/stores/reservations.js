import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as reservationsApi from '../api/reservations'

export const useReservationsStore = defineStore('reservations', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(params = {}) {
    loading.value = true
    error.value = null
    try {
      items.value = await reservationsApi.list(params)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить бронирования'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const r = await reservationsApi.create(data)
      items.value.push(r)
      return r
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать бронирование'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const r = await reservationsApi.update(id, data)
      const idx = items.value.findIndex((i) => i.id === id)
      if (idx !== -1) items.value[idx] = r
      return r
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить бронирование'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await reservationsApi.destroy(id)
      items.value = items.value.filter((i) => i.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить бронирование'
      throw e
    } finally {
      loading.value = false
    }
  }

  function replaceItem(id, updated) {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) items.value[idx] = updated
  }

  async function checkIn(id) {
    error.value = null
    try {
      const r = await reservationsApi.checkIn(id)
      replaceItem(id, r)
      return r
    } catch (e) {
      error.value = e.response?.data?.error || 'Ошибка check-in'
      throw e
    }
  }

  async function checkOut(id) {
    error.value = null
    try {
      const r = await reservationsApi.checkOut(id)
      replaceItem(id, r)
      return r
    } catch (e) {
      error.value = e.response?.data?.error || 'Ошибка check-out'
      throw e
    }
  }

  async function cancelReservation(id) {
    error.value = null
    try {
      const r = await reservationsApi.cancel(id)
      replaceItem(id, r)
      return r
    } catch (e) {
      error.value = e.response?.data?.error || 'Ошибка отмены'
      throw e
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy, checkIn, checkOut, cancelReservation, replaceItem }
})
