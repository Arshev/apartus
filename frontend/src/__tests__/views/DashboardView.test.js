import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue('t'),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import DashboardView from '../../views/DashboardView.vue'
import { useAuthStore } from '../../stores/auth'

describe('DashboardView', () => {
  it('renders greeting with user full_name and organization name', async () => {
    const wrapper = mountWithVuetify(DashboardView)
    const store = useAuthStore()
    store.user = { id: 1, full_name: 'Иван Иванов' }
    store.organization = { id: 1, name: 'Тест Орг' }
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Здравствуйте, Иван Иванов')
    expect(wrapper.text()).toContain('Тест Орг')
  })
})
