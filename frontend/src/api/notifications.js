import apiClient from './client'

export async function list(reservationId) {
  const response = await apiClient.get(`/reservations/${reservationId}/notifications`)
  return response.data
}
