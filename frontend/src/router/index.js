import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/properties',
    name: 'Properties',
    component: () => import('../views/PropertyListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/properties/new',
    name: 'PropertyNew',
    component: () => import('../views/PropertyFormView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/properties/:id/edit',
    name: 'PropertyEdit',
    component: () => import('../views/PropertyFormView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/properties/:propertyId/units',
    name: 'Units',
    component: () => import('../views/UnitListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/properties/:propertyId/units/new',
    name: 'UnitNew',
    component: () => import('../views/UnitFormView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/properties/:propertyId/units/:id/edit',
    name: 'UnitEdit',
    component: () => import('../views/UnitFormView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/amenities',
    name: 'Amenities',
    component: () => import('../views/AmenityListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/branches',
    name: 'Branches',
    component: () => import('../views/PlaceholderView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/auth/login',
    name: 'login',
    component: () => import('../pages/auth/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/register',
    name: 'register',
    component: () => import('../pages/auth/RegisterPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/select-organization',
    name: 'selectOrganization',
    component: () => import('../pages/auth/SelectOrganizationPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.user && !authStore.loading) {
    await authStore.fetchCurrentUser()
  }

  const isAuthenticated = !!authStore.user
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const isGuestRoute = to.matched.some((r) => r.meta.guest)

  if (requiresAuth && !isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (isGuestRoute && isAuthenticated) {
    return { name: 'Dashboard' }
  }
})

export default router
