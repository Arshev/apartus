import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/members')
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/members', data)
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/members/${id}`, data)
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/members/${id}`)
  return response.data
}
