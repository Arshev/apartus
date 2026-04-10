import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue({
    user: { id: 1, full_name: 'Demo' },
    organizations: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    organization: { id: 2, name: 'B' },
    membership: { role: 'owner', permissions: [] },
  }),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue('t'),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import AppSidebar from '../../components/AppSidebar.vue'
import { useAuthStore } from '../../stores/auth'

const ROUTES = [
  { path: '/', component: { template: '<div/>' } },
  { path: '/properties', component: { template: '<div/>' } },
  { path: '/units', component: { template: '<div/>' } },
  { path: '/amenities', component: { template: '<div/>' } },
  { path: '/branches', component: { template: '<div/>' } },
]

describe('AppSidebar', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('exposes 4 navigation items (Dashboard + 3 top-level; Units nested under Properties)', () => {
    const wrapper = mountWithVuetify(AppSidebar, { routes: ROUTES, props: { modelValue: true } })
    const navItems = wrapper.vm.navItems
    expect(navItems).toHaveLength(4)
    expect(navItems.map((n) => n.title)).toEqual([
      'Dashboard', 'Properties', 'Amenities', 'Branches',
    ])
  })

  it('renders organization name when authenticated', async () => {
    const wrapper = mountWithVuetify(AppSidebar, { routes: ROUTES, props: { modelValue: true } })
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo' }
    store.organization = { id: 1, name: 'Org A' }
    store.organizations = [store.organization]
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Org A')
  })

  it('switchOrg calls authStore.switchOrganization and pushes to / (SC-03)', async () => {
    const wrapper = mountWithVuetify(AppSidebar, { routes: ROUTES, props: { modelValue: true } })
    const store = useAuthStore()
    const spy = vi.spyOn(store, 'switchOrganization')
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')

    const targetOrg = { id: 2, name: 'B' }
    await wrapper.vm.switchOrg(targetOrg)

    expect(spy).toHaveBeenCalledWith(targetOrg)
    expect(pushSpy).toHaveBeenCalledWith('/')
  })
})
