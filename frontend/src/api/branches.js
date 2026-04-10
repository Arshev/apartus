import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/branches')
  return response.data
}

export async function get(id) {
  const response = await apiClient.get(`/branches/${id}`)
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/branches', { branch: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/branches/${id}`, { branch: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/branches/${id}`)
  return response.data
}
