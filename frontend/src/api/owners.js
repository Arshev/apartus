import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/owners')
  return response.data
}

export async function get(id) {
  const response = await apiClient.get(`/owners/${id}`)
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/owners', { owner: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/owners/${id}`, { owner: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/owners/${id}`)
  return response.data
}

export async function statement(id, params = {}) {
  const response = await apiClient.get(`/owners/${id}/statement`, { params })
  return response.data
}
