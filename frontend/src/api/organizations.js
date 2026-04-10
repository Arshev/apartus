import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/organizations')
  return response.data
}

export async function get(id) {
  const response = await apiClient.get(`/organizations/${id}`)
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/organizations/${id}`, { organization: data })
  return response.data
}
