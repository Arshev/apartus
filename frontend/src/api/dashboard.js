import apiClient from './client'

export async function get(params = {}) {
  const response = await apiClient.get('/dashboard', { params })
  return response.data
}
