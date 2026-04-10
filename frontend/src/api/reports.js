import apiClient from './client'

export async function financial(params = {}) {
  const response = await apiClient.get('/reports/financial', { params })
  return response.data
}
