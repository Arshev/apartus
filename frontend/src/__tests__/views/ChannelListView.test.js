import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/channels', () => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn(), update: vi.fn(), destroy: vi.fn().mockResolvedValue({}),
  sync: vi.fn().mockResolvedValue({ id: 1, last_synced_at: '2026-04-11' }),
}))
vi.mock('../../api/allUnits', () => ({
  list: vi.fn().mockResolvedValue([]),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import ChannelListView from '../../views/ChannelListView.vue'
import { useChannelsStore } from '../../stores/channels'

describe('ChannelListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('exposes platforms list + platformLabel mapper', () => {
    const wrapper = mountWithPrimeVue(ChannelListView)
    expect(wrapper.vm.platformLabel('booking_com')).toContain('Booking')
    expect(wrapper.vm.platforms.length).toBe(4)
  })

  it('openCreate resets form', () => {
    const wrapper = mountWithPrimeVue(ChannelListView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editing).toBeNull()
    expect(wrapper.vm.form.platform).toBe('booking_com')
  })

  it('openEdit fills form', () => {
    const wrapper = mountWithPrimeVue(ChannelListView)
    wrapper.vm.openEdit({ id: 1, platform: 'airbnb', ical_import_url: 'https://example.com' })
    expect(wrapper.vm.editing.id).toBe(1)
    expect(wrapper.vm.form.platform).toBe('airbnb')
  })

  it('handleDelete invokes store.destroy', async () => {
    const wrapper = mountWithPrimeVue(ChannelListView)
    const store = useChannelsStore()
    vi.spyOn(store, 'destroy')
    await wrapper.vm.handleDelete({ id: 1 })
    expect(store.destroy).toHaveBeenCalledWith(1)
  })

  it('doSync calls store.syncChannel', async () => {
    const wrapper = mountWithPrimeVue(ChannelListView)
    const store = useChannelsStore()
    vi.spyOn(store, 'syncChannel').mockResolvedValue({})
    await wrapper.vm.doSync({ id: 1 })
    expect(store.syncChannel).toHaveBeenCalledWith(1)
  })

  it('platformLabel covers all enums', () => {
    const wrapper = mountWithPrimeVue(ChannelListView)
    expect(wrapper.vm.platformLabel('booking_com')).toBe('Booking.com')
    expect(wrapper.vm.platformLabel('airbnb')).toBe('Airbnb')
    expect(wrapper.vm.platformLabel('ostrovok')).toBe('Островок')
  })
})
