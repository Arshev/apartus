import apiClient from './client'

export async function list(unitId) {
  const response = await apiClient.get(`/units/${unitId}/amenities`)
  return response.data
}

export async function attach(unitId, amenityId) {
  const response = await apiClient.post(`/units/${unitId}/amenities`, {
    unit_amenity: { amenity_id: amenityId },
  })
  return response.data
}

export async function detach(unitId, amenityId) {
  const response = await apiClient.delete(`/units/${unitId}/amenities/${amenityId}`)
  return response.data
}
