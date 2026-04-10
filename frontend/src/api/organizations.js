import apiClient from './client'

export async function list() {
  const response = await apiClient.get('/organizations')
  return response.data
}

// Singular resource — GET /organization (current org, no id)
export async function get() {
  const response = await apiClient.get('/organization')
  return response.data
}

// Singular resource — PATCH /organization
export async function update(data) {
  const response = await apiClient.patch('/organization', { organization: data })
  return response.data
}
