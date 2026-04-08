import apiClient from './client'

export async function signUp(data) {
  const response = await apiClient.post('/auth/sign_up', data)
  return response.data
}

export async function signIn(data) {
  const response = await apiClient.post('/auth/sign_in', data)
  return response.data
}

export async function signOut() {
  const response = await apiClient.delete('/auth/sign_out')
  return response.data
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me')
  return response.data
}
