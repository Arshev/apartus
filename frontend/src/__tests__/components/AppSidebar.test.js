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

import { mountWithPrimeVue, mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import AppSidebar from '../../components/AppSidebar.vue'
import { useAuthStore } from '../../stores/auth'

const ROUTES = [
  { path: '/', component: { template: '<div/>' } },
  { path: '/properties', component: { template: '<div/>' } },
  { path: '/units', component: { template: '<div/>' } },
  { path: '/amenities', component: { template: '<div/>' } },
  { path: '/branches', component: { template: '<div/>' } },
]

describe('AppSidebar (FT-036 P1)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('exposes 13 navigation items with PrimeIcons', () => {
    const wrapper = mountWithPrimeVue(AppSidebar, { routes: ROUTES, props: { modelValue: true } })
    const navItems = wrapper.vm.navItems
    expect(navItems).toHaveLength(13)
    expect(navItems.map((n) => n.title)).toEqual([
      'Главная', 'Бронирования', 'Календарь', 'Гости', 'Объекты',
      'Собственники', 'Каналы', 'Задачи', 'Расходы', 'Отчёты',
      'Удобства', 'Филиалы', 'Настройки',
    ])
    // All icons should be PrimeIcons (pi-*) post-migration
    for (const item of navItems) {
      expect(item.icon).toMatch(/^pi-/)
    }
  })

  it('renders organization name when authenticated', async () => {
    const wrapper = mountWithPrimeVue(AppSidebar, { routes: ROUTES, props: { modelValue: true } })
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Demo' }
    store.organization = { id: 1, name: 'Org A' }
    store.organizations = [store.organization]
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Org A')
  })

  it('switchOrg calls authStore.switchOrganization and pushes to /', async () => {
    const wrapper = mountWithPrimeVue(AppSidebar, { routes: ROUTES, props: { modelValue: true } })
    const store = useAuthStore()
    const spy = vi.spyOn(store, 'switchOrganization')
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')

    const targetOrg = { id: 2, name: 'B' }
    await wrapper.vm.switchOrg(targetOrg)

    expect(spy).toHaveBeenCalledWith(targetOrg)
    expect(pushSpy).toHaveBeenCalledWith('/')
  })

  it('isActive differentiates root route vs nested', async () => {
    const wrapper = await mountWithPrimeVueAsync(AppSidebar, {
      routes: ROUTES,
      props: { modelValue: true },
      initialRoute: '/properties',
    })
    expect(wrapper.vm.isActive({ to: '/' })).toBe(false)
    expect(wrapper.vm.isActive({ to: '/properties' })).toBe(true)
  })

  it('v-navigation-drawer shell preserved (hybrid, data-width=256)', () => {
    const wrapper = mountWithPrimeVue(AppSidebar, { routes: ROUTES, props: { modelValue: true } })
    const drawer = wrapper.find('[data-stub="v-navigation-drawer"]')
    expect(drawer.exists()).toBe(true)
    expect(drawer.attributes('data-width')).toBe('256')
  })
})
