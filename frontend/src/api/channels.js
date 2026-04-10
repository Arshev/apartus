import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/channels')
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/channels', { channel: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/channels/${id}`, { channel: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/channels/${id}`)
  return response.data
}

export async function sync(id) {
  const response = await apiClient.post(`/channels/${id}/sync`)
  return response.data
}
