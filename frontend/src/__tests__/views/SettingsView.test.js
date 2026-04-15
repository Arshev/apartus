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

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import SettingsView from '../../views/SettingsView.vue'
import { useAuthStore } from '../../stores/auth'
import i18n from '../../plugins/i18n'
import * as orgApi from '../../api/organizations'
import * as membersApi from '../../api/members'
import * as rolesApi from '../../api/roles'

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // i18n.global.locale is shared across tests; reset so locale-mutating
    // cases (handleOrgSave with orgForm.locale = 'en') don't leak into
    // subsequent assertions on Russian role labels.
    i18n.global.locale.value = 'ru'
    localStorage.clear()
  })

  function setup() {
    const wrapper = mountWithVuetify(SettingsView)
    const auth = useAuthStore()
    auth.user = { id: 1, full_name: 'Demo' }
    auth.organization = { id: 1, name: 'Org' }
    return wrapper
  }

  it('renders tabs', () => {
    const wrapper = setup()
    expect(wrapper.text()).toContain('Настройки организации')
  })

  // -- General --
  it('loadOrg + handleOrgSave work with auth org', async () => {
    const wrapper = setup()
    // Wait for reactivity to propagate
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    // Now manually call loadOrg (onMounted may have fired before org was set)
    await wrapper.vm.loadOrg()
    expect(wrapper.vm.orgForm.name).toBe('Org')

    wrapper.vm.orgForm.name = 'New Name'
    await wrapper.vm.handleOrgSave()
    expect(orgApi.update).toHaveBeenCalledWith({ name: 'New Name', currency: 'RUB', settings: { locale: 'ru' } })
    expect(wrapper.vm.orgSnackbar).toBe(true)
  })

  it('handleOrgSave error sets orgError', async () => {
    orgApi.update.mockRejectedValueOnce({ response: { data: { error: ['bad'] } } })
    const wrapper = setup()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.vm.handleOrgSave()
    expect(wrapper.vm.orgError).toBeTruthy()
  })

  // Regression guard for the P1 merge bug: saving language must NOT drop
  // existing telegram settings from organization.settings (backend replaces
  // the JSONB column wholesale, so the client has to round-trip every key).
  it('handleOrgSave preserves existing telegram settings when saving locale', async () => {
    orgApi.get.mockResolvedValueOnce({
      id: 1, name: 'Org', slug: 'org', currency: 'RUB',
      settings: { telegram_bot_token: 'T', telegram_chat_id: 'C', locale: 'ru' },
    })
    const wrapper = setup()
    await wrapper.vm.$nextTick()
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

  // Symmetric regression guard: saving telegram credentials must NOT drop
  // locale from organization.settings.
  it('saveTelegram preserves existing locale when saving telegram credentials', async () => {
    orgApi.get.mockResolvedValueOnce({
      id: 1, name: 'Org', slug: 'org', currency: 'RUB',
      settings: { locale: 'en' },
    })
    const wrapper = setup()
    await wrapper.vm.$nextTick()
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

  // -- Members --
  it('openAddMember resets form', () => {
    const wrapper = setup()
    wrapper.vm.openAddMember()
    expect(wrapper.vm.editingMember).toBeNull()
    expect(wrapper.vm.memberDialog).toBe(true)
  })

  it('openEditMember fills role', () => {
    const wrapper = setup()
    wrapper.vm.openEditMember({ id: 1, role: 'manager' })
    expect(wrapper.vm.editingMember.id).toBe(1)
    expect(wrapper.vm.memberForm.role).toBe('manager')
  })

  it('handleMemberSubmit create calls API', async () => {
    const wrapper = setup()
    wrapper.vm.openAddMember()
    wrapper.vm.memberForm = { email: 'a@b.c', first_name: 'A', last_name: 'B', password: 'p', role: 'member' }
    await wrapper.vm.handleMemberSubmit()
    expect(membersApi.create).toHaveBeenCalled()
    expect(wrapper.vm.memberDialog).toBe(false)
  })

  it('handleMemberSubmit edit calls API', async () => {
    const wrapper = setup()
    wrapper.vm.openEditMember({ id: 1, role: 'member' })
    wrapper.vm.memberForm.role = 'manager'
    await wrapper.vm.handleMemberSubmit()
    expect(membersApi.update).toHaveBeenCalledWith(1, { role_enum: 'manager' })
  })

  it('handleMemberSubmit error shows snackbar', async () => {
    membersApi.create.mockRejectedValueOnce(new Error('fail'))
    const wrapper = setup()
    wrapper.vm.openAddMember()
    wrapper.vm.memberForm = { email: 'x', role: 'member' }
    await wrapper.vm.handleMemberSubmit()
    expect(wrapper.vm.memberSubmitting).toBe(false)
  })

  it('handleDeleteMember calls API', async () => {
    const wrapper = setup()
    wrapper.vm.confirmDeleteMember({ id: 2, user: { full_name: 'B' } })
    await wrapper.vm.handleDeleteMember()
    expect(membersApi.destroy).toHaveBeenCalledWith(2)
    expect(wrapper.vm.deleteMemberDialog).toBe(false)
  })

  it('handleDeleteMember error', async () => {
    membersApi.destroy.mockRejectedValueOnce(new Error('fail'))
    const wrapper = setup()
    wrapper.vm.confirmDeleteMember({ id: 2, user: { full_name: 'B' } })
    await wrapper.vm.handleDeleteMember()
    expect(wrapper.vm.deleteMemberDialog).toBe(false)
  })

  it('roleLabel maps enum', () => {
    const wrapper = setup()
    expect(wrapper.vm.roleLabel('owner')).toBe('Владелец')
    expect(wrapper.vm.roleLabel('member')).toBe('Участник')
  })

  // -- Roles --
  it('openAddRole resets form', () => {
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

  it('handleRoleSubmit error', async () => {
    rolesApi.create.mockRejectedValueOnce(new Error('fail'))
    const wrapper = setup()
    wrapper.vm.openAddRole()
    wrapper.vm.roleForm = { name: 'X', code: 'x' }
    await wrapper.vm.handleRoleSubmit()
    expect(wrapper.vm.roleSubmitting).toBe(false)
  })

  it('handleDeleteRole calls API', async () => {
    const wrapper = setup()
    wrapper.vm.confirmDeleteRole({ id: 2, name: 'Custom' })
    await wrapper.vm.handleDeleteRole()
    expect(rolesApi.destroy).toHaveBeenCalledWith(2)
  })

  it('handleDeleteRole error', async () => {
    rolesApi.destroy.mockRejectedValueOnce(new Error('403'))
    const wrapper = setup()
    wrapper.vm.confirmDeleteRole({ id: 1, name: 'System' })
    await wrapper.vm.handleDeleteRole()
    expect(wrapper.vm.deleteRoleDialog).toBe(false)
  })
})
