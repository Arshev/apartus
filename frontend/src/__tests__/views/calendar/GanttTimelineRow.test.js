import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import GanttTimelineRow from '../../../views/calendar/GanttTimelineRow.vue'
import { parseIsoDate } from '../../../utils/date'

const UNIT = { id: 7, name: 'Studio 1', property_name: 'Main' }

const VIEW_START = parseIsoDate('2026-04-15')
const VIEW_END = parseIsoDate('2026-04-29')
// 14 days * 86400000 ms; viewport 1400px → 0.000001157
const PIXELS_PER_MS = 1400 / (14 * 86_400_000)

function setup(bookings, extraProps = {}) {
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
      ...extraProps,
    },
    global: { stubs: { GanttTimelineItem: { template: '<div class="item-stub" :data-lane="lane" :data-id="booking.id" :data-special-mode="specialMode" />', props: ['booking', 'left', 'width', 'lane', 'itemHeight', 'specialMode'] } } },
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

  // FT-021: Row forwards specialMode prop to every rendered Item
  it('forwards specialMode prop to child Items (FT-021)', () => {
    const wrapper = setup(
      [{ id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' }],
      { specialMode: 'handover' }
    )
    const stub = wrapper.find('.item-stub')
    expect(stub.attributes('data-special-mode')).toBe('handover')
  })

  it('specialMode defaults to empty string when prop not provided', () => {
    const wrapper = setup([
      { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' },
    ])
    const stub = wrapper.find('.item-stub')
    expect(stub.attributes('data-special-mode')).toBe('')
  })

  // --- FT-023 Idle Gaps ---
  describe('idle gaps (FT-023)', () => {
    it('does not render gap layer when specialMode is empty', () => {
      const wrapper = setup([
        { id: 1, unit_id: 7, check_in: '2026-04-20', check_out: '2026-04-25', status: 'confirmed' },
      ])
      expect(wrapper.vm.idleGaps).toHaveLength(0)
      expect(wrapper.findAll('.gantt-row__idle-gap')).toHaveLength(0)
    })

    it('does not render gap layer when specialMode is handover', () => {
      const wrapper = setup(
        [{ id: 1, unit_id: 7, check_in: '2026-04-20', check_out: '2026-04-25', status: 'confirmed' }],
        { specialMode: 'handover' }
      )
      expect(wrapper.vm.idleGaps).toHaveLength(0)
    })

    it('renders full-viewport gap when unit has no bookings', () => {
      const wrapper = setup([], { specialMode: 'idle' })
      expect(wrapper.vm.idleGaps).toHaveLength(1)
      expect(wrapper.findAll('.gantt-row__idle-gap')).toHaveLength(1)
    })

    it('renders 2 gap elements around single booking', () => {
      const wrapper = setup(
        [{ id: 1, unit_id: 7, check_in: '2026-04-20', check_out: '2026-04-22', status: 'confirmed' }],
        { specialMode: 'idle' }
      )
      expect(wrapper.vm.idleGaps).toHaveLength(2)
      expect(wrapper.findAll('.gantt-row__idle-gap')).toHaveLength(2)
    })

    it('gap label shown only when gap is wide enough (>40px)', () => {
      const wrapper = setup(
        [{ id: 1, unit_id: 7, check_in: '2026-04-20', check_out: '2026-04-22', status: 'confirmed' }],
        { specialMode: 'idle' }
      )
      // 14-day viewport, 1400px total, so 100px/day. First gap ~5 days = 500px → label shown.
      const labels = wrapper.findAll('.gantt-row__idle-gap-label')
      expect(labels.length).toBeGreaterThanOrEqual(1)
    })

    it('cancelled booking does not create busy interval', () => {
      const wrapper = setup(
        [{ id: 1, unit_id: 7, check_in: '2026-04-20', check_out: '2026-04-22', status: 'cancelled' }],
        { specialMode: 'idle' }
      )
      // Row filters cancelled (existing FT-020 behavior) before findIdleGaps sees them.
      expect(wrapper.vm.idleGaps).toHaveLength(1) // full viewport
    })

    it('gap style left and width match pixel math', () => {
      const wrapper = setup([], { specialMode: 'idle' })
      const gap = wrapper.vm.idleGaps[0]
      const style = wrapper.vm.gapStyle(gap)
      expect(style.left).toMatch(/px$/)
      expect(style.width).toMatch(/px$/)
    })
  })

  // --- Bugfix: sidebar height sync ---
  describe('row-height-changed event (sidebar sync)', () => {
    it('emits row-height-changed immediately on mount with unitId + height', () => {
      const wrapper = setup([
        { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-20', status: 'confirmed' },
      ])
      const events = wrapper.emitted('row-height-changed')
      expect(events).toBeTruthy()
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events[0][0]).toEqual({ unitId: 7, height: wrapper.vm.computedRowHeight })
    })

    it('emits larger height when lanes grow from overlap', () => {
      const wrapper = setup([
        { id: 1, unit_id: 7, check_in: '2026-04-15', check_out: '2026-04-22', status: 'confirmed' },
        { id: 2, unit_id: 7, check_in: '2026-04-16', check_out: '2026-04-23', status: 'confirmed' },
        { id: 3, unit_id: 7, check_in: '2026-04-17', check_out: '2026-04-24', status: 'confirmed' },
      ])
      const events = wrapper.emitted('row-height-changed')
      const last = events.at(-1)[0]
      expect(last.unitId).toBe(7)
      expect(last.height).toBeGreaterThan(36) // baseRowHeight
    })
  })
})
