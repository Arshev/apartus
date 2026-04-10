import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/guests')
  return response.data
}

export async function get(id) {
  const response = await apiClient.get(`/guests/${id}`)
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/guests', { guest: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/guests/${id}`, { guest: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/guests/${id}`)
  return response.data
}
