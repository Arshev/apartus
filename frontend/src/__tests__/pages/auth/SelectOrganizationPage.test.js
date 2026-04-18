import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue({
    user: { id: 1 }, organizations: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    organization: { id: 1 }, membership: { role: 'owner', permissions: [] },
  }),
}))
vi.mock('../../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue('t'),
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import { mountWithPrimeVue } from '../../helpers/mountWithPrimeVue'
import SelectOrganizationPage from '../../../pages/auth/SelectOrganizationPage.vue'
import { useAuthStore } from '../../../stores/auth'

const ROUTES = [
  { path: '/', name: 'Dashboard', component: { template: '<div/>' } },
  { path: '/auth/select-organization', name: 'selectOrganization', component: SelectOrganizationPage },
]

describe('SelectOrganizationPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders title', () => {
    const wrapper = mountWithPrimeVue(SelectOrganizationPage, { routes: ROUTES })
    expect(wrapper.text()).toContain('Выберите организацию')
  })

  it('selectOrganization calls store.switchOrganization and routes to /', async () => {
    const wrapper = mountWithPrimeVue(SelectOrganizationPage, { routes: ROUTES })
    const store = useAuthStore()
    const spy = vi.spyOn(store, 'switchOrganization')
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')

    await wrapper.vm.selectOrganization({ id: 2, name: 'B' })
    expect(spy).toHaveBeenCalledWith({ id: 2, name: 'B' })
    expect(pushSpy).toHaveBeenCalledWith('/')
  })
})
