import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import GanttTimelineRow from '../../../views/calendar/GanttTimelineRow.vue'
import { parseIsoDate } from '../../../utils/date'

const UNIT = { id: 7, name: 'Studio 1', property_name: 'Main' }

const VIEW_START = parseIsoDate('2026-04-15')
const VIEW_END = parseIsoDate('2026-04-29')
// 14 days * 86400000 ms; viewport 1400px → 0.000001157
const PIXELS_PER_MS = 1400 / (14 * 86_400_000)

function setup(bookings) {
  return mountWithVuetify(GanttTimelineRow, {
    props: {
      unit: UNIT,
      bookings,
      viewStart: VIEW_START,
      viewEnd: VIEW_END,
      pixelsPerMs: PIXELS_PER_MS,
      totalWidth: 1400,
      baseRowHeight: 36,
      itemHeight: 28,
    },
    global: { stubs: { GanttTimelineItem: { template: '<div class="item-stub" :data-lane="lane" :data-id="booking.id" />', props: ['booking', 'left', 'width', 'lane', 'itemHeight'] } } },
  })
}

describe('GanttTimelineRow', () => {
  let warnSpy
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('filters bookings to this unit only', () => {
    const wrapper = setup([
      { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' },
      { id: 2, unit_id: 99, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' },
    ])
    expect(wrapper.findAll('.item-stub')).toHaveLength(1)
    expect(wrapper.find('.item-stub').attributes('data-id')).toBe('1')
  })

  it('skips cancelled reservations (NEG-07)', () => {
    const wrapper = setup([
      { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'cancelled' },
      { id: 2, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' },
    ])
    expect(wrapper.findAll('.item-stub')).toHaveLength(1)
    expect(wrapper.find('.item-stub').attributes('data-id')).toBe('2')
  })

  it('skips orphan reservations without unit_id (NEG-03) with warn', () => {
    const wrapper = setup([
      { id: 1, unit_id: null, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' },
    ])
    expect(wrapper.findAll('.item-stub')).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('skips reservation with check_in >= check_out (NEG-02) with warn', () => {
    const wrapper = setup([
      { id: 1, unit_id: 7, check_in: '2026-04-20', check_out: '2026-04-15', status: 'confirmed' },
      { id: 2, unit_id: 7, check_in: '2026-04-20', check_out: '2026-04-20', status: 'confirmed' },
    ])
    expect(wrapper.findAll('.item-stub')).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledTimes(2)
  })

  it('places single booking in lane 0', () => {
    const wrapper = setup([
      { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' },
    ])
    expect(wrapper.find('.item-stub').attributes('data-lane')).toBe('0')
    expect(wrapper.vm.laneData.maxLane).toBe(1)
  })

  it('stacks 3 overlapping bookings in lanes 0/1/2 — SC-05', () => {
    const wrapper = setup([
      { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-22', status: 'confirmed' },
      { id: 2, unit_id: 7, check_in: '2026-04-16', check_out: '2026-04-23', status: 'confirmed' },
      { id: 3, unit_id: 7, check_in: '2026-04-17', check_out: '2026-04-24', status: 'confirmed' },
    ])
    const stubs = wrapper.findAll('.item-stub')
    expect(stubs).toHaveLength(3)
    const lanes = stubs.map((s) => s.attributes('data-lane'))
    expect(lanes.sort()).toEqual(['0', '1', '2'])
    expect(wrapper.vm.laneData.maxLane).toBe(3)
  })

  it('row height grows with maxLanes', () => {
    const wrapper1 = setup([{ id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' }])
    const wrapper3 = setup([
      { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-22', status: 'confirmed' },
      { id: 2, unit_id: 7, check_in: '2026-04-16', check_out: '2026-04-23', status: 'confirmed' },
      { id: 3, unit_id: 7, check_in: '2026-04-17', check_out: '2026-04-24', status: 'confirmed' },
    ])
    expect(wrapper3.vm.computedRowHeight).toBeGreaterThan(wrapper1.vm.computedRowHeight)
  })

  it('item left/width derived from pixelsPerMs', () => {
    const wrapper = setup([
      { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' },
    ])
    const item = wrapper.vm.enrichedBookings[0]
    expect(wrapper.vm.itemLeft(item)).toBeCloseTo(0)
    // 5 days * 86400000 * pixelsPerMs = 5/14 * 1400 = 500
    expect(wrapper.vm.itemWidth(item)).toBeCloseTo(500)
  })
})
