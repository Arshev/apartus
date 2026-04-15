import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../api/reservations', () => ({
  list: vi.fn().mockResolvedValue([]),
  checkIn: vi.fn().mockResolvedValue({}),
  checkOut: vi.fn().mockResolvedValue({}),
  cancel: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../../api/allUnits', () => ({
  list: vi.fn().mockResolvedValue([{ id: 1, name: 'U1', property_name: 'P1' }]),
}))

import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import GanttCalendarView from '../../../views/calendar/GanttCalendarView.vue'
import * as reservationsApi from '../../../api/reservations'
import * as allUnitsApi from '../../../api/allUnits'

const STORAGE_KEY = 'apartus-calendar-view'

const TIMELINE_STUB = {
  template: '<div class="timeline-stub" />',
  props: ['units', 'reservations', 'viewStart', 'viewEnd', 'baseRowHeight', 'itemHeight'],
  methods: { scrollToToday: vi.fn(), scrollToDate: vi.fn() },
}

function setup() {
  const wrapper = mountWithVuetify(GanttCalendarView, {
    global: {
      stubs: {
        GanttTimeline: TIMELINE_STUB,
        GanttTooltip: true,
      },
    },
  })
  return wrapper
}

describe('GanttCalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    reservationsApi.list.mockResolvedValue([])
    allUnitsApi.list.mockResolvedValue([{ id: 1, name: 'U1', property_name: 'P1' }])
  })

  it('loads reservations + units on mount with default 14d range', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(reservationsApi.list).toHaveBeenCalledTimes(1)
    expect(allUnitsApi.list).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.rangeDays).toBe(14)
  })

  it('refetches reservations when range changes', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    reservationsApi.list.mockClear()
    wrapper.vm.rangeDays = 30
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(reservationsApi.list).toHaveBeenCalled()
  })

  it('persists range to localStorage on change', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick()
    wrapper.vm.rangeDays = 7
    await wrapper.vm.$nextTick()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.rangeDays).toBe(7)
  })

  it('reads persisted range from localStorage on mount', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 30 }))
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(wrapper.vm.rangeDays).toBe(30)
  })

  it('falls back to default when stored range is unsupported', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: 999 }))
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(wrapper.vm.rangeDays).toBe(14)
  })

  it('falls back to default when localStorage throws (NEG-04)', async () => {
    const orig = Storage.prototype.getItem
    Storage.prototype.getItem = vi.fn(() => { throw new Error('blocked') })
    try {
      const wrapper = setup()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.rangeDays).toBe(14)
    } finally {
      Storage.prototype.getItem = orig
    }
  })

  it('manual refresh button triggers loadData', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    reservationsApi.list.mockClear()
    await wrapper.vm.loadData()
    expect(reservationsApi.list).toHaveBeenCalledTimes(1)
  })

  it('visibilitychange listener triggers refetch when tab becomes visible', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    reservationsApi.list.mockClear()
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper.vm.$nextTick()
    expect(reservationsApi.list).toHaveBeenCalled()
  })

  it('shows error alert when loadData fails (NEG-06)', async () => {
    reservationsApi.list.mockRejectedValueOnce(new Error('500'))
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(wrapper.vm.error).toBeTruthy()
  })

  it('shows empty-state when no units (NEG-01)', async () => {
    allUnitsApi.list.mockResolvedValue([])
    const wrapper = setup()
    await wrapper.vm.loadData()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.units).toHaveLength(0)
    expect(wrapper.text()).toContain('Нет юнитов')
  })

  it('show-booking event navigates to edit page', () => {
    const wrapper = setup()
    const router = wrapper.vm.$router
    const pushSpy = vi.spyOn(router, 'push')
    wrapper.vm.onShowBooking(42)
    expect(pushSpy).toHaveBeenCalledWith('/reservations/42/edit')
  })

  it('contextCheckIn invokes API + reloads', async () => {
    const wrapper = setup()
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    wrapper.vm.contextMenu = { open: true, booking: { id: 5, status: 'confirmed' }, x: 0, y: 0 }
    reservationsApi.list.mockClear()
    await wrapper.vm.contextCheckIn()
    expect(reservationsApi.checkIn).toHaveBeenCalledWith(5)
    expect(reservationsApi.list).toHaveBeenCalled()
  })

  it('contextCheckIn shows snackbar on failure (NEG-05)', async () => {
    reservationsApi.checkIn.mockRejectedValueOnce(new Error('422'))
    const wrapper = setup()
    await wrapper.vm.$nextTick()
    wrapper.vm.contextMenu = { open: true, booking: { id: 5, status: 'confirmed' }, x: 0, y: 0 }
    await wrapper.vm.contextCheckIn()
    expect(wrapper.vm.snackbar.open).toBe(true)
    expect(wrapper.vm.snackbar.color).toBe('error')
  })

  it('show-tooltip event sets tooltip state visible', () => {
    const wrapper = setup()
    wrapper.vm.onShowTooltip({ booking: { id: 1 }, x: 100, y: 200 })
    expect(wrapper.vm.tooltip).toMatchObject({ visible: true, x: 100, y: 200 })
  })

  it('hide-tooltip clears visibility', () => {
    const wrapper = setup()
    wrapper.vm.onShowTooltip({ booking: { id: 1 }, x: 100, y: 200 })
    wrapper.vm.onHideTooltip()
    expect(wrapper.vm.tooltip.visible).toBe(false)
  })
})
