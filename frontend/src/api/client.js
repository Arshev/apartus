import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
})

let isRefreshing = false
let refreshSubscribers = []

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback)
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
}

// Request interceptor — add auth token and org header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const orgId = localStorage.getItem('currentOrganizationId')
  if (orgId) {
    config.headers['X-Organization-Id'] = orgId
  }

  return config
})

// Response interceptor — handle 401 with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error

    if (response?.status === 401 && !config._retry) {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshToken = localStorage.getItem('refresh_token')
          if (!refreshToken) throw new Error('No refresh token')

          const { data } = await axios.post(
            `${apiClient.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken },
          )
          localStorage.setItem('auth_token', data.token)
          localStorage.setItem('refresh_token', data.refresh_token)
          isRefreshing = false
          onRefreshed(data.token)

          config._retry = true
          config.headers.Authorization = `Bearer ${data.token}`
          return apiClient(config)
        } catch {
          isRefreshing = false
          onRefreshed(null)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('currentOrganizationId')
          window.location.href = '/auth/login'
          return Promise.reject(error)
        }
      }

      return new Promise((resolve, reject) => {
        addRefreshSubscriber((newToken) => {
          if (!newToken) return reject(error)
          config._retry = true
          config.headers.Authorization = `Bearer ${newToken}`
          resolve(apiClient(config))
        })
      })
    }

    return Promise.reject(error)
  },
)

export const setAuthToken = (token) => localStorage.setItem('auth_token', token)
export const setRefreshToken = (token) => localStorage.setItem('refresh_token', token)
export const getAuthToken = () => localStorage.getItem('auth_token')
export const removeAuthTokens = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
}

export default apiClient
