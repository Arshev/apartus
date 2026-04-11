import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/channels', () => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn(), update: vi.fn(), destroy: vi.fn().mockResolvedValue({}),
  sync: vi.fn().mockResolvedValue({ id: 1, last_synced_at: '2026-04-11' }),
}))
vi.mock('../../api/allUnits', () => ({
  list: vi.fn().mockResolvedValue([]),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ChannelListView from '../../views/ChannelListView.vue'
import { useChannelsStore } from '../../stores/channels'

describe('ChannelListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct headers', () => {
    const wrapper = mountWithVuetify(ChannelListView)
    expect(wrapper.vm.headers.map((h) => h.key)).toContain('unit_name')
    expect(wrapper.vm.headers.map((h) => h.key)).toContain('platform')
  })

  it('openCreate resets form', () => {
    const wrapper = mountWithVuetify(ChannelListView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editing).toBeNull()
    expect(wrapper.vm.form.platform).toBe('booking_com')
  })

  it('openEdit fills form', () => {
    const wrapper = mountWithVuetify(ChannelListView)
    wrapper.vm.openEdit({ id: 1, platform: 'airbnb', ical_import_url: 'https://example.com' })
    expect(wrapper.vm.editing.id).toBe(1)
    expect(wrapper.vm.form.platform).toBe('airbnb')
  })

  it('confirmDelete + handleDelete', async () => {
    const wrapper = mountWithVuetify(ChannelListView)
    const store = useChannelsStore()
    vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1 })
    await wrapper.vm.handleDelete()
    expect(store.destroy).toHaveBeenCalledWith(1)
  })

  it('doSync calls store.syncChannel', async () => {
    const wrapper = mountWithVuetify(ChannelListView)
    const store = useChannelsStore()
    vi.spyOn(store, 'syncChannel').mockResolvedValue({})
    await wrapper.vm.doSync({ id: 1 })
    expect(store.syncChannel).toHaveBeenCalledWith(1)
  })

  it('platformLabels covers all enums', () => {
    const wrapper = mountWithVuetify(ChannelListView)
    expect(wrapper.vm.platformLabels).toHaveProperty('booking_com')
    expect(wrapper.vm.platformLabels).toHaveProperty('airbnb')
    expect(wrapper.vm.platformLabels).toHaveProperty('ostrovok')
  })
})
