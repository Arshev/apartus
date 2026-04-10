import apiClient from './client'

export async function list(unitId) {
  const response = await apiClient.get(`/units/${unitId}/seasonal_prices`)
  return response.data
}

export async function create(unitId, data) {
  const response = await apiClient.post(`/units/${unitId}/seasonal_prices`, { seasonal_price: data })
  return response.data
}

export async function update(unitId, id, data) {
  const response = await apiClient.patch(`/units/${unitId}/seasonal_prices/${id}`, { seasonal_price: data })
  return response.data
}

export async function destroy(unitId, id) {
  const response = await apiClient.delete(`/units/${unitId}/seasonal_prices/${id}`)
  return response.data
}
