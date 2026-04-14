import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '../api/auth'
import { setAuthToken, setRefreshToken, removeAuthTokens, getAuthToken } from '../api/client'
import i18n from '../plugins/i18n'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const organization = ref(null)
  const organizations = ref([])
  const membership = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isOwner = computed(() => membership.value?.role === 'owner')
  const isManager = computed(() => ['owner', 'manager'].includes(membership.value?.role))
  const permissions = computed(() => membership.value?.permissions || [])

  function can(permission) {
    if (isOwner.value) return true
    return permissions.value.includes(permission)
  }

  async function signUp(data) {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.signUp(data)
      setAuthToken(response.token)
      setRefreshToken(response.refresh_token)
      user.value = response.user
      organization.value = response.organization
      organizations.value = [response.organization]
      localStorage.setItem('currentOrganizationId', response.organization.id)
      return response
    } catch (e) {
      error.value = e.response?.data?.error || 'Ошибка регистрации'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function signIn(credentials) {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.signIn(credentials)
      setAuthToken(response.token)
      setRefreshToken(response.refresh_token)
      user.value = response.user
      organizations.value = response.organizations

      if (response.organizations.length === 1) {
        await switchOrganization(response.organizations[0])
      }

      return response
    } catch (e) {
      error.value = e.response?.data?.error || 'Неверный email или пароль'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    try {
      await authApi.signOut()
    } finally {
      removeAuthTokens()
      localStorage.removeItem('currentOrganizationId')
      user.value = null
      organization.value = null
      organizations.value = []
      membership.value = null
      loading.value = false
    }
  }

  async function fetchCurrentUser() {
    const token = getAuthToken()
    if (!token) {
      user.value = null
      return null
    }

    loading.value = true
    error.value = null
    try {
      const response = await authApi.getCurrentUser()
      user.value = response.user
      organizations.value = response.organizations
      if (response.organization) {
        organization.value = response.organization
        membership.value = response.membership
        const locale = response.organization.settings?.locale
        if (locale && ['ru', 'en'].includes(locale)) {
          i18n.global.locale.value = locale
        }
      }
      return response
    } catch (e) {
      if (e.response?.status === 401 || !e.response) {
        removeAuthTokens()
        localStorage.removeItem('currentOrganizationId')
        user.value = null
        organization.value = null
        organizations.value = []
        membership.value = null
      } else {
        error.value = i18n.global.t('common.messages.loadError')
      }
    } finally {
      loading.value = false
    }
  }

  async function switchOrganization(org) {
    organization.value = org
    localStorage.setItem('currentOrganizationId', org.id)
    membership.value = null
    await fetchCurrentUser()
  }

  return {
    user, organization, organizations, membership, loading, error,
    isAuthenticated, isOwner, isManager, permissions,
    can, signUp, signIn, signOut, fetchCurrentUser, switchOrganization,
  }
})
