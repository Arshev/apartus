import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as exchangeRatesApi from '../api/exchangeRates'

export const useExchangeRatesStore = defineStore('exchangeRates', () => {
  const apiRates = ref([])
  const manualOverrides = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const data = await exchangeRatesApi.list()
      apiRates.value = data.api_rates || []
      manualOverrides.value = data.manual_overrides || []
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить курсы валют'
      apiRates.value = []
      manualOverrides.value = []
    } finally {
      loading.value = false
    }
  }

  async function createOverride(data) {
    loading.value = true
    error.value = null
    try {
      const rate = await exchangeRatesApi.create(data)
      manualOverrides.value = [rate, ...manualOverrides.value]
      return rate
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать курс'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateOverride(id, data) {
    loading.value = true
    error.value = null
    try {
      const rate = await exchangeRatesApi.update(id, data)
      const idx = manualOverrides.value.findIndex((r) => r.id === id)
      if (idx !== -1) manualOverrides.value.splice(idx, 1, rate)
      return rate
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить курс'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteOverride(id) {
    loading.value = true
    error.value = null
    try {
      await exchangeRatesApi.destroy(id)
      manualOverrides.value = manualOverrides.value.filter((r) => r.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить курс'
      throw e
    } finally {
      loading.value = false
    }
  }

  function rateAsMajorUnit(rateX1e10) {
    if (rateX1e10 == null) return '—'
    return (Number(rateX1e10) / 1e10).toFixed(6).replace(/\.?0+$/, '')
  }

  return {
    apiRates,
    manualOverrides,
    loading,
    error,
    fetchAll,
    createOverride,
    updateOverride,
    deleteOverride,
    rateAsMajorUnit,
  }
})
