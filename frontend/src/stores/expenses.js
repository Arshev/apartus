import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as expensesApi from '../api/expenses'

export const useExpensesStore = defineStore('expenses', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(params = {}) {
    loading.value = true
    error.value = null
    try {
      items.value = await expensesApi.list(params)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить расходы'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const expense = await expensesApi.create(data)
      items.value.push(expense)
      return expense
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать расход'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const expense = await expensesApi.update(id, data)
      const idx = items.value.findIndex((e) => e.id === id)
      if (idx !== -1) items.value[idx] = expense
      return expense
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить расход'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await expensesApi.destroy(id)
      items.value = items.value.filter((e) => e.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить расход'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchAll, create, update, destroy }
})
