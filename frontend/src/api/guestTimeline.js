import apiClient from './client'

export async function get(guestId) {
  const response = await apiClient.get(`/guests/${guestId}/timeline`)
  return response.data
}
