import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/pricing_rules')
  return response.data
}

export async function create(data) {
  const response = await apiClient.post('/pricing_rules', { pricing_rule: data })
  return response.data
}

export async function update(id, data) {
  const response = await apiClient.patch(`/pricing_rules/${id}`, { pricing_rule: data })
  return response.data
}

export async function destroy(id) {
  const response = await apiClient.delete(`/pricing_rules/${id}`)
  return response.data
}
