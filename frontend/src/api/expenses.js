import apiClient from './client'

export async function list(params = {}) {
  const response = await apiClient.get('/expenses', { params })
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/expenses', { expense: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/expenses/${id}`, { expense: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/expenses/${id}`)
  return response.data
}
