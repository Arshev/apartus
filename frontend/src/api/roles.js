import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/roles')
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/roles', { role: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/roles/${id}`, { role: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/roles/${id}`)
  return response.data
}
