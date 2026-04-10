import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/properties')
  return response.data
}

export async function get(id) {
  const response = await apiClient.get(`/properties/${id}`)
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/properties', { property: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/properties/${id}`, { property: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/properties/${id}`)
  return response.data
}
