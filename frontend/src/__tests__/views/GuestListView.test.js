import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/guests', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import GuestListView from '../../views/GuestListView.vue'
import { useGuestsStore } from '../../stores/guests'

describe('GuestListView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has correct headers', () => {
    const wrapper = mountWithVuetify(GuestListView)
    expect(wrapper.vm.headers.map((h) => h.key)).toEqual(['full_name', 'email', 'phone', 'actions'])
  })

  it('renders add button', () => {
    const wrapper = mountWithVuetify(GuestListView)
    expect(wrapper.text()).toContain('Добавить гостя')
  })

  it('confirmDelete + handleDelete', async () => {
    const wrapper = mountWithVuetify(GuestListView)
    const store = useGuestsStore()
    vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1, first_name: 'A', last_name: 'B' })
    await wrapper.vm.handleDelete()
    expect(store.destroy).toHaveBeenCalledWith(1)
  })

  it('handleDelete error', async () => {
    const wrapper = mountWithVuetify(GuestListView)
    const store = useGuestsStore()
    vi.spyOn(store, 'destroy').mockRejectedValue(new Error('fail'))
    store.error = 'fail'
    wrapper.vm.confirmDelete({ id: 1, first_name: 'A', last_name: 'B' })
    await wrapper.vm.handleDelete()
    expect(wrapper.vm.deleteDialog).toBe(false)
  })
})
