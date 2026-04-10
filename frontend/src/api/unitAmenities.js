import apiClient from './client'

export async function attach(unitId, amenityId) {
  const response = await apiClient.post(`/units/${unitId}/amenities/${amenityId}`)
  return response.data
}

export async function detach(unitId, amenityId) {
  const response = await apiClient.delete(`/units/${unitId}/amenities/${amenityId}`)
  return response.data
}
