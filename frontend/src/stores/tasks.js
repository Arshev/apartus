import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as tasksApi from '../api/tasks'

export const useTasksStore = defineStore('tasks', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  const pending = computed(() => items.value.filter((t) => t.status === 'pending'))
  const inProgress = computed(() => items.value.filter((t) => t.status === 'in_progress'))
  const completed = computed(() => items.value.filter((t) => t.status === 'completed'))

  async function fetchAll(params = {}) {
    loading.value = true
    error.value = null
    try {
      items.value = await tasksApi.list(params)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось загрузить задачи'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const task = await tasksApi.create(data)
      items.value.push(task)
      return task
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось создать задачу'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const task = await tasksApi.update(id, data)
      const idx = items.value.findIndex((t) => t.id === id)
      if (idx !== -1) items.value[idx] = task
      return task
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось обновить задачу'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function destroy(id) {
    loading.value = true
    error.value = null
    try {
      await tasksApi.destroy(id)
      items.value = items.value.filter((t) => t.id !== id)
    } catch (e) {
      error.value = e.response?.data?.error || 'Не удалось удалить задачу'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, pending, inProgress, completed, fetchAll, create, update, destroy }
})
