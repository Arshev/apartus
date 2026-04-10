import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/branches')
  return response.data
}
