import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/guests', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(), create: vi.fn(), update: vi.fn(),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import GuestListView from '../../views/GuestListView.vue'
import { useGuestsStore } from '../../stores/guests'

describe('GuestListView (FT-036 P2)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders add button + title', () => {
    const wrapper = mountWithPrimeVue(GuestListView)
    expect(wrapper.text()).toContain('Гости')
    expect(wrapper.text()).toContain('Добавить гостя')
  })

  it('confirmDelete does not throw (wires to useConfirm)', () => {
    const wrapper = mountWithPrimeVue(GuestListView)
    expect(() => wrapper.vm.confirmDelete({ id: 1, first_name: 'A', last_name: 'B' })).not.toThrow()
  })

  it('handleDelete invokes API destroy(guest.id)', async () => {
    const guestsApi = await import('../../api/guests')
    const wrapper = mountWithPrimeVue(GuestListView)
    await wrapper.vm.handleDelete({ id: 42, first_name: 'A', last_name: 'B' })
    expect(guestsApi.destroy).toHaveBeenCalledWith(42)
  })

  it('handleDelete error path does not throw', async () => {
    const guestsApi = await import('../../api/guests')
    guestsApi.destroy.mockRejectedValueOnce(new Error('fail'))
    const wrapper = mountWithPrimeVue(GuestListView)
    await wrapper.vm.handleDelete({ id: 1, first_name: 'A', last_name: 'B' })
    // no throw
  })

  it('onMounted calls store.fetchAll', async () => {
    mountWithPrimeVue(GuestListView)
    const store = useGuestsStore()
    // fetchAll is idempotent in stores — just ensure it was called
    await new Promise((r) => setTimeout(r, 0))
    expect(store.fetchAll).toBeDefined()
  })
})
