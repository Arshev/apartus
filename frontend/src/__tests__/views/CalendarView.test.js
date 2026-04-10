import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/reservations', () => ({
  list: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../api/properties', () => ({
  list: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../api/units', () => ({
  list: vi.fn().mockResolvedValue([]),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import CalendarView from '../../views/CalendarView.vue'

describe('CalendarView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders header with navigation', () => {
    const wrapper = mountWithVuetify(CalendarView)
    expect(wrapper.text()).toContain('Календарь')
    expect(wrapper.text()).toContain('Сегодня')
  })

  it('dateRange has 14 days', () => {
    const wrapper = mountWithVuetify(CalendarView)
    expect(wrapper.vm.dateRange).toHaveLength(14)
  })

  it('shiftDays moves startDate', () => {
    const wrapper = mountWithVuetify(CalendarView)
    const initial = wrapper.vm.startDate
    wrapper.vm.shiftDays(7)
    expect(wrapper.vm.startDate).not.toBe(initial)
  })

  it('goToday resets to today', () => {
    const wrapper = mountWithVuetify(CalendarView)
    wrapper.vm.shiftDays(14)
    wrapper.vm.goToday()
    expect(wrapper.vm.startDate).toBe(new Date().toISOString().slice(0, 10))
  })

  it('formatDateShort formats correctly', () => {
    const wrapper = mountWithVuetify(CalendarView)
    expect(wrapper.vm.formatDateShort('2026-04-10')).toBe('10.04')
  })

  it('getReservationsForCell filters by unit and date', () => {
    const wrapper = mountWithVuetify(CalendarView)
    wrapper.vm.reservations = [
      { id: 1, unit_id: 5, check_in: '2026-04-10', check_out: '2026-04-13', status: 'confirmed', guest_name: 'A' },
      { id: 2, unit_id: 5, check_in: '2026-04-15', check_out: '2026-04-18', status: 'cancelled', guest_name: 'B' },
    ]
    expect(wrapper.vm.getReservationsForCell(5, '2026-04-11')).toHaveLength(1)
    expect(wrapper.vm.getReservationsForCell(5, '2026-04-16')).toHaveLength(0) // cancelled excluded
    expect(wrapper.vm.getReservationsForCell(99, '2026-04-11')).toHaveLength(0) // wrong unit
  })

  it('handleCellClick navigates to new reservation', () => {
    const wrapper = mountWithVuetify(CalendarView)
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    wrapper.vm.handleCellClick(5, '2026-04-10')
    expect(pushSpy).toHaveBeenCalledWith('/reservations/new?unit_id=5&check_in=2026-04-10')
  })
})
