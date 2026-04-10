import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/all_units')
  return response.data
}
