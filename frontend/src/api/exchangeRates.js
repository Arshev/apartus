import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/exchange_rates')
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/exchange_rates', { exchange_rate: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/exchange_rates/${id}`, { exchange_rate: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/exchange_rates/${id}`)
  return response.data
}
