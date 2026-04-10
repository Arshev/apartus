import apiClient from './client'

export async function list(params = {}) {
  const response = await apiClient.get('/reservations', { params })
  return response.data
}

export async function get(id) {
  const response = await apiClient.get(`/reservations/${id}`)
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/reservations', { reservation: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/reservations/${id}`, { reservation: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/reservations/${id}`)
  return response.data
}

export async function checkIn(id) {
  const response = await apiClient.patch(`/reservations/${id}/check_in`)
  return response.data
}

export async function checkOut(id) {
  const response = await apiClient.patch(`/reservations/${id}/check_out`)
  return response.data
}

export async function cancel(id) {
  const response = await apiClient.patch(`/reservations/${id}/cancel`)
  return response.data
}
