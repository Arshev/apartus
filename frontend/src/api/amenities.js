import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/amenities')
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/amenities', { amenity: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/amenities/${id}`, { amenity: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/amenities/${id}`)
  return response.data
}
