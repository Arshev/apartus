import { describe, it, expect, beforeEach } from 'vitest'
import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import GanttTooltip from '../../../views/calendar/GanttTooltip.vue'
import { useAuthStore } from '../../../stores/auth'

const TEAPOT = {
  id: 1,
  guest_name: 'Иван Петров',
  check_in: '2026-04-15',
  check_out: '2026-04-20',
  status: 'confirmed',
  total_price_cents: 50000,
  property_name: 'Главный дом',
  unit_name: 'Студия №1',
}

describe('GanttTooltip', () => {
  beforeEach(() => {
    // Stub Teleport so jsdom can find rendered content via wrapper queries.
  })

  function setup(propsOverride = {}, orgCurrency = 'RUB') {
    const wrapper = mountWithVuetify(GanttTooltip, {
      props: { booking: TEAPOT, visible: true, x: 100, y: 200, ...propsOverride },
      global: { stubs: { Teleport: { template: '<div><slot /></div>' } } },
    })
    const auth = useAuthStore()
    auth.organization = { id: 1, name: 'Org', currency: orgCurrency }
    return wrapper
  }

  it('renders guest name + dates + price + status when visible', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toContain('Иван Петров')
    expect(text).toContain('2026-04-15')
    expect(text).toContain('2026-04-20')
    // Price 50000 cents = 500 ₽
    expect(text).toMatch(/500/)
  })

  it('renders blocking placeholder when guest_name missing', async () => {
    const wrapper = setup({ booking: { ...TEAPOT, guest_name: null } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Блокировка')
  })

  it('formats price with org currency from auth store', async () => {
    const wrapper = setup({}, 'EUR')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/€|EUR/)
  })

  it('falls back to RUB when org has no currency (FM-07)', async () => {
    const wrapper = mountWithVuetify(GanttTooltip, {
      props: { booking: TEAPOT, visible: true, x: 0, y: 0 },
      global: { stubs: { Teleport: { template: '<div><slot /></div>' } } },
    })
    const auth = useAuthStore()
    auth.organization = { id: 1, name: 'Org' } // currency undefined
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/₽|RUB/)
  })

  it('does not render when visible=false', async () => {
    const wrapper = setup({ visible: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Иван Петров')
  })

  it('does not render when booking is null', async () => {
    const wrapper = setup({ booking: null })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.gantt-tooltip').exists()).toBe(false)
  })

  it('maps status enum (snake_case) to locale key (camelCase)', () => {
    const wrapper = setup({ booking: { ...TEAPOT, status: 'checked_in' } })
    expect(wrapper.vm.statusKey).toBe('checkedIn')
  })

  it('renders property and unit names in muted row', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toContain('Главный дом')
    expect(text).toContain('Студия №1')
  })
})
