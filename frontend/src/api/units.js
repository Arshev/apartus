import apiClient from './client'

export async function list(propertyId) {
  const response = await apiClient.get(`/properties/${propertyId}/units`)
  return response.data
}

export async function get(propertyId, id) {
  const response = await apiClient.get(`/properties/${propertyId}/units/${id}`)
  return response.data
}

export async function create(propertyId, data) {
  const response = await apiClient.post(`/properties/${propertyId}/units`, { unit: data })
  return response.data
}

export async function update(propertyId, id, data) {
  const response = await apiClient.patch(`/properties/${propertyId}/units/${id}`, { unit: data })
  return response.data
}

export async function destroy(propertyId, id) {
  const response = await apiClient.delete(`/properties/${propertyId}/units/${id}`)
  return response.data
}
