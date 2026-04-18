import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue('t'),
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../api/organizations', () => ({
  list: vi.fn(),
  get: vi.fn().mockResolvedValue({ id: 1, name: 'Org', slug: 'org', currency: 'RUB' }),
  update: vi.fn().mockImplementation((payload) => Promise.resolve({
    id: 1, name: 'Updated', currency: 'RUB', settings: payload.settings || {},
  })),
}))
vi.mock('../../api/members', () => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 1, user: { id: 1 }, role: 'member' }),
  update: vi.fn().mockResolvedValue({ id: 1, role: 'manager' }),
  destroy: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../api/roles', () => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 1, name: 'Admin', code: 'admin' }),
  update: vi.fn().mockResolvedValue({ id: 2, name: 'Updated' }),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import SettingsView from '../../views/SettingsView.vue'
import { useAuthStore } from '../../stores/auth'
import i18n from '../../plugins/i18n'
import * as orgApi from '../../api/organizations'
import * as membersApi from '../../api/members'
import * as rolesApi from '../../api/roles'

describe('SettingsView (FT-036 P3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'ru'
    localStorage.clear()
  })

  function setup() {
    const wrapper = mountWithPrimeVue(SettingsView)
    const auth = useAuthStore()
    auth.user = { id: 1, full_name: 'Demo' }
    auth.organization = { id: 1, name: 'Org' }
    return wrapper
  }

  it('renders title', () => {
    const wrapper = setup()
    expect(wrapper.text()).toContain('Настройки организации')
  })

  // ── General ──
  it('loadOrg populates form + handleOrgSave calls API', async () => {
    const wrapper = setup()
    await wrapper.vm.loadOrg()
    expect(wrapper.vm.orgForm.name).toBe('Org')

    wrapper.vm.orgForm.name = 'New Name'
    await wrapper.vm.handleOrgSave()
    expect(orgApi.update).toHaveBeenCalledWith({
      name: 'New Name',
      currency: 'RUB',
      settings: { locale: 'ru' },
    })
  })

  it('handleOrgSave error sets orgError', async () => {
    orgApi.update.mockRejectedValueOnce({ response: { data: { error: ['bad'] } } })
    const wrapper = setup()
    await wrapper.vm.loadOrg()
    await wrapper.vm.handleOrgSave()
    expect(wrapper.vm.orgError).toBeTruthy()
  })

  // Regression: saving language must preserve existing telegram settings
  it('handleOrgSave preserves telegram settings on locale save', async () => {
    orgApi.get.mockResolvedValueOnce({
      id: 1, name: 'Org', slug: 'org', currency: 'RUB',
      settings: { telegram_bot_token: 'T', telegram_chat_id: 'C', locale: 'ru' },
    })
    const wrapper = setup()
    await wrapper.vm.loadOrg()
    wrapper.vm.orgForm.locale = 'en'
    await wrapper.vm.handleOrgSave()
    const payload = orgApi.update.mock.calls.at(-1)[0]
    expect(payload.settings).toEqual({
      telegram_bot_token: 'T',
      telegram_chat_id: 'C',
      locale: 'en',
    })
  })

  // Regression: saveTelegram preserves existing locale
  it('saveTelegram preserves locale when saving bot credentials', async () => {
    orgApi.get.mockResolvedValueOnce({
      id: 1, name: 'Org', slug: 'org', currency: 'RUB',
      settings: { locale: 'en' },
    })
    const wrapper = setup()
    await wrapper.vm.loadOrg()
    wrapper.vm.telegramForm.bot_token = 'T2'
    wrapper.vm.telegramForm.chat_id = 'C2'
    await wrapper.vm.saveTelegram()
    const payload = orgApi.update.mock.calls.at(-1)[0]
    expect(payload.settings).toEqual({
      locale: 'en',
      telegram_bot_token: 'T2',
      telegram_chat_id: 'C2',
    })
  })

  // ── Members ──
  it('openAddMember resets + opens dialog', () => {
    const wrapper = setup()
    wrapper.vm.openAddMember()
    expect(wrapper.vm.editingMember).toBeNull()
    expect(wrapper.vm.memberDialog).toBe(true)
  })

  it('openEditMember fills role only (preserves email/name/pwd field lock)', () => {
    const wrapper = setup()
    wrapper.vm.openEditMember({ id: 1, role: 'manager' })
    expect(wrapper.vm.editingMember.id).toBe(1)
    expect(wrapper.vm.memberForm.role).toBe('manager')
    // Edit mode: memberForm set to { role } only — email/first_name/last_name/password absent
    expect(wrapper.vm.memberForm.email).toBeUndefined()
    expect(wrapper.vm.memberForm.password).toBeUndefined()
  })

  it('handleMemberSubmit create calls API', async () => {
    const wrapper = setup()
    wrapper.vm.openAddMember()
    wrapper.vm.memberForm = {
      email: 'a@b.com', first_name: 'A', last_name: 'B', password: 'p', role: 'member',
    }
    await wrapper.vm.handleMemberSubmit()
    expect(membersApi.create).toHaveBeenCalled()
    expect(wrapper.vm.memberDialog).toBe(false)
  })

  it('handleMemberSubmit edit calls API with role_enum', async () => {
    const wrapper = setup()
    wrapper.vm.openEditMember({ id: 1, role: 'member' })
    wrapper.vm.memberForm.role = 'manager'
    await wrapper.vm.handleMemberSubmit()
    expect(membersApi.update).toHaveBeenCalledWith(1, { role_enum: 'manager' })
  })

  it('handleMemberSubmit error clears submitting flag', async () => {
    membersApi.create.mockRejectedValueOnce(new Error('fail'))
    const wrapper = setup()
    wrapper.vm.openAddMember()
    wrapper.vm.memberForm = { email: 'x', role: 'member' }
    await wrapper.vm.handleMemberSubmit()
    expect(wrapper.vm.memberSubmitting).toBe(false)
  })

  it('handleDeleteMember calls API destroy', async () => {
    const wrapper = setup()
    await wrapper.vm.handleDeleteMember({ id: 2, user: { full_name: 'B' } })
    expect(membersApi.destroy).toHaveBeenCalledWith(2)
  })

  it('roleLabel maps enum', () => {
    const wrapper = setup()
    expect(wrapper.vm.roleLabel('owner')).toBe('Владелец')
    expect(wrapper.vm.roleLabel('member')).toBe('Участник')
  })

  // ── Roles ──
  it('openAddRole resets + opens dialog', () => {
    const wrapper = setup()
    wrapper.vm.openAddRole()
    expect(wrapper.vm.editingRole).toBeNull()
    expect(wrapper.vm.roleDialog).toBe(true)
  })

  it('handleRoleSubmit create calls API', async () => {
    const wrapper = setup()
    wrapper.vm.openAddRole()
    wrapper.vm.roleForm = { name: 'Admin', code: 'admin' }
    await wrapper.vm.handleRoleSubmit()
    expect(rolesApi.create).toHaveBeenCalledWith({ name: 'Admin', code: 'admin' })
  })

  it('handleRoleSubmit edit calls API', async () => {
    const wrapper = setup()
    wrapper.vm.openEditRole({ id: 2, name: 'Old', code: 'old' })
    wrapper.vm.roleForm.name = 'New'
    await wrapper.vm.handleRoleSubmit()
    expect(rolesApi.update).toHaveBeenCalledWith(2, { name: 'New', code: 'old' })
  })

  it('handleDeleteRole calls API destroy', async () => {
    const wrapper = setup()
    await wrapper.vm.handleDeleteRole({ id: 2, name: 'Custom' })
    expect(rolesApi.destroy).toHaveBeenCalledWith(2)
  })

  it('telegram test flow: testTelegram saves first then pings', async () => {
    const wrapper = setup()
    await wrapper.vm.loadOrg()
    wrapper.vm.telegramForm.bot_token = 'T'
    wrapper.vm.telegramForm.chat_id = 'C'
    await wrapper.vm.testTelegram()
    // saveTelegram called inside testTelegram
    expect(orgApi.update).toHaveBeenCalled()
    expect(wrapper.vm.telegramSuccess).toBe(true)
  })
})
