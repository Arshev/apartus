import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

vi.mock('../../api/auth', () => ({
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getCurrentUser: vi.fn(),
}))
vi.mock('../../api/client', () => ({
  setAuthToken: vi.fn(), setRefreshToken: vi.fn(),
  removeAuthTokens: vi.fn(), getAuthToken: vi.fn().mockReturnValue('t'),
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../api/reservations', () => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn().mockResolvedValue({
    unit_id: 1, guest_id: null, check_in: '2026-05-01', check_out: '2026-05-03',
    guests_count: 2, total_price_cents: 20000, notes: '',
  }),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({ id: 1 }),
  destroy: vi.fn(),
  checkIn: vi.fn(), checkOut: vi.fn(), cancel: vi.fn(),
}))
vi.mock('../../api/allUnits', () => ({
  list: vi.fn().mockResolvedValue([
    { id: 1, property_name: 'Hotel', name: 'Room 1', base_price_cents: 5000 },
    { id: 2, property_name: 'Hotel', name: 'Room 2', base_price_cents: 7000 },
  ]),
}))
vi.mock('../../api/guests', () => ({
  list: vi.fn().mockResolvedValue([
    { id: 1, first_name: 'John', last_name: 'Doe' },
  ]),
  create: vi.fn(),
}))
vi.mock('../../api/seasonalPrices', () => ({
  list: vi.fn().mockResolvedValue([]),
}))

import { mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import ReservationFormView from '../../views/ReservationFormView.vue'

describe('ReservationFormView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function mount(route = '/reservations/new') {
    return mountWithPrimeVueAsync(ReservationFormView, {
      routes: [
        { path: '/reservations/new', component: ReservationFormView },
        { path: '/reservations/:id/edit', component: ReservationFormView },
        { path: '/reservations', component: { template: '<div/>' } },
      ],
      initialRoute: route,
    })
  }

  it('isEdit is false for new reservation', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.isEdit).toBe(false)
  })

  it('isEdit is true for edit route', async () => {
    const wrapper = await mount('/reservations/1/edit')
    expect(wrapper.vm.isEdit).toBe(true)
  })

  it('loadSelectors populates units and guests', async () => {
    const wrapper = await mount()
    await wrapper.vm.loadSelectors()
    expect(wrapper.vm.units.length).toBe(2)
    expect(wrapper.vm.units[0].label).toContain('Hotel')
    expect(wrapper.vm.guests.length).toBe(1)
  })

  it('rules.required validates correctly', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.rules.required('')).toBe('Обязательное поле')
    expect(wrapper.vm.rules.required('test')).toBe(true)
  })

  it('rules.minOne validates correctly', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.rules.minOne(0)).toBe('Минимум 1')
    expect(wrapper.vm.rules.minOne(1)).toBe(true)
  })

  it('form defaults are correct', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.form.guests_count).toBe(1)
    expect(wrapper.vm.form.unit_id).toBeNull()
  })

  // FT-035 cases

  it('form uses total_price_cents (not total_price_rub)', async () => {
    const wrapper = await mount()
    expect('total_price_cents' in wrapper.vm.form).toBe(true)
    expect('total_price_rub' in wrapper.vm.form).toBe(false)
  })

  it('prefills total_price_cents directly from API (no /100)', async () => {
    const wrapper = await mount('/reservations/1/edit')
    await wrapper.vm.loadReservation()
    await nextTick()
    expect(wrapper.vm.form.total_price_cents).toBe(20000)
    expect(wrapper.vm.manualOverride).toBe(true)
  })

  it('onTotalInput sets manualOverride=true', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.manualOverride).toBe(false)
    wrapper.vm.onTotalInput('150.00')
    expect(wrapper.vm.manualOverride).toBe(true)
    expect(wrapper.vm.form.total_price_cents).toBe(15000)
  })

  it('onRecalc resets manualOverride', async () => {
    const wrapper = await mount()
    wrapper.vm.manualOverride = true
    wrapper.vm.onRecalc()
    expect(wrapper.vm.manualOverride).toBe(false)
  })

  it('onGuestCreated appends guest and selects', async () => {
    const wrapper = await mount()
    await wrapper.vm.loadSelectors()
    const newGuest = { id: 99, first_name: 'New', last_name: 'Guest' }
    wrapper.vm.onGuestCreated(newGuest)
    expect(wrapper.vm.guests.some((g) => g.id === 99)).toBe(true)
    expect(wrapper.vm.form.guest_id).toBe(99)
    expect(wrapper.vm.guestDialogOpen).toBe(false)
  })

  it('buildPayload returns total_price_cents (not total_price_rub)', async () => {
    const wrapper = await mount()
    wrapper.vm.form.unit_id = 1
    wrapper.vm.form.check_in = '2026-04-15'
    wrapper.vm.form.check_out = '2026-04-20'
    wrapper.vm.form.guests_count = 2
    wrapper.vm.form.total_price_cents = 2500000
    const payload = wrapper.vm.buildPayload()
    expect(payload.total_price_cents).toBe(2500000)
    expect(payload.total_price_rub).toBeUndefined()
  })

  it('currency resolves to RUB when authStore.organization empty', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.currency).toBe('RUB')
  })

  it('autoTotalCents = 0 when unit/dates missing', async () => {
    const wrapper = await mount()
    expect(wrapper.vm.autoTotalCents).toBe(0)
  })

  it('renders 4 sections with aria-labelledby', async () => {
    const wrapper = await mount()
    await nextTick()
    const sections = wrapper.findAll('section[aria-labelledby]')
    expect(sections.length).toBeGreaterThanOrEqual(4)
  })
})
