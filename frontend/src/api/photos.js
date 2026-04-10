import apiClient from './client'

export async function listPropertyPhotos(propertyId) {
  const response = await apiClient.get(`/properties/${propertyId}/photos`)
  return response.data
}

export async function uploadPropertyPhotos(propertyId, files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('photos[]', file)
  }
  const response = await apiClient.post(`/properties/${propertyId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function deletePropertyPhoto(propertyId, photoId) {
  const response = await apiClient.delete(`/properties/${propertyId}/photos/${photoId}`)
  return response.data
}

export async function listUnitPhotos(unitId) {
  const response = await apiClient.get(`/units/${unitId}/photos`)
  return response.data
}

export async function uploadUnitPhotos(unitId, files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('photos[]', file)
  }
  const response = await apiClient.post(`/units/${unitId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function deleteUnitPhoto(unitId, photoId) {
  const response = await apiClient.delete(`/units/${unitId}/photos/${photoId}`)
  return response.data
}
