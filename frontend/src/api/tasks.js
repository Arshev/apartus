import apiClient from './client'

export async function list(params = {}) {
  const response = await apiClient.get('/tasks', { params })
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/tasks', { task: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/tasks/${id}`, { task: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/tasks/${id}`)
  return response.data
}
