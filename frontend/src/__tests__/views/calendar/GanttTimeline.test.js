import { describe, it, expect } from 'vitest'
import { mountWithPrimeVue } from '../../helpers/mountWithPrimeVue'
import GanttTimeline from '../../../views/calendar/GanttTimeline.vue'
import { parseIsoDate, addDays } from '../../../utils/date'

const UNITS = [
  { id: 1, name: 'Studio 1', property_name: 'Main' },
  { id: 2, name: 'Suite A', property_name: 'Annex' },
]

const RES = [
  { id: 11, unit_id: 1, check_in: '2026-04-15', check_out: '2026-04-18', status: 'confirmed' },
  { id: 12, unit_id: 2, check_in: '2026-04-20', check_out: '2026-04-22', status: 'checked_in' },
]

function setup(viewStartIso, viewEndIso, extraProps = {}) {
  return mountWithPrimeVue(GanttTimeline, {
    props: {
      units: UNITS,
      reservations: RES,
      viewStart: parseIsoDate(viewStartIso),
      viewEnd: parseIsoDate(viewEndIso),
      ...extraProps,
    },
    global: {
      stubs: {
        GanttTimelineHeader: { template: '<div class="header-stub" />', props: ['viewStart', 'viewEnd', 'pixelsPerMs', 'totalWidth'] },
        GanttTimelineRow: { template: '<div class="row-stub" :data-unit-id="unit.id" :data-special-mode="specialMode" />', props: ['unit', 'bookings', 'viewStart', 'viewEnd', 'pixelsPerMs', 'totalWidth', 'baseRowHeight', 'itemHeight', 'specialMode'] },
      },
    },
  })
}

describe('GanttTimeline', () => {
  it('renders one row per unit', () => {
    const wrapper = setup('2026-04-15', '2026-04-28')
    const rows = wrapper.findAll('.row-stub')
    expect(rows).toHaveLength(2)
    expect(rows[0].attributes('data-unit-id')).toBe('1')
    expect(rows[1].attributes('data-unit-id')).toBe('2')
  })

  it('renders one header', () => {
    const wrapper = setup('2026-04-15', '2026-04-28')
    expect(wrapper.findAll('.header-stub')).toHaveLength(1)
  })

  it('renders sidebar with property + unit names', () => {
    const wrapper = setup('2026-04-15', '2026-04-28')
    const text = wrapper.text()
    expect(text).toContain('Main')
    expect(text).toContain('Studio 1')
    expect(text).toContain('Annex')
    expect(text).toContain('Suite A')
  })

  it('pixelsPerMs results in min day width >= 40px', () => {
    const wrapper = setup('2026-04-15', '2026-04-28') // 14 days
    const dayPx = wrapper.vm.pixelsPerMs * 86_400_000
    expect(dayPx).toBeGreaterThanOrEqual(40)
  })

  it('totalWidth reflects pixelsPerMs * rangeMs (14 days inclusive)', () => {
    const wrapper = setup('2026-04-15', '2026-04-28') // 14 days inclusive
    // viewEnd - viewStart = 13 ms-days + MS_PER_DAY = 14 days
    const expected = wrapper.vm.pixelsPerMs * 14 * 86_400_000
    expect(wrapper.vm.totalWidth).toBeCloseTo(expected, 1)
  })

  it('renders today marker when today is in range', async () => {
    const today = new Date()
    const start = addDays(today, -3)
    const end = addDays(today, 3)
    const wrapper = mountWithPrimeVue(GanttTimeline, {
      props: { units: UNITS, reservations: [], viewStart: start, viewEnd: end },
      global: {
        stubs: {
          GanttTimelineHeader: { template: '<div />', props: ['viewStart', 'viewEnd', 'pixelsPerMs', 'totalWidth'] },
          GanttTimelineRow: { template: '<div />', props: ['unit', 'bookings', 'viewStart', 'viewEnd', 'pixelsPerMs', 'totalWidth', 'baseRowHeight', 'itemHeight'] },
        },
      },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.todayInRange).toBe(true)
    expect(wrapper.find('[data-testid="today-marker"]').exists()).toBe(true)
  })

  it('does NOT render today marker when today is out of range', () => {
    const wrapper = setup('2030-01-01', '2030-01-14')
    expect(wrapper.vm.todayInRange).toBe(false)
    expect(wrapper.find('[data-testid="today-marker"]').exists()).toBe(false)
  })

  // FT-032 today column anchor
  it('renders today-column tint when today is in range', async () => {
    // Choose a viewStart/viewEnd that contains "today" — system date.
    const today = new Date()
    const viewStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const viewEnd = new Date(viewStart)
    viewEnd.setDate(viewEnd.getDate() + 13)
    const wrapper = mountWithPrimeVue(GanttTimeline, {
      props: {
        units: [{ id: 1, name: 'U1', property_name: 'P1' }],
        reservations: [],
        viewStart,
        viewEnd,
      },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.todayInRange).toBe(true)
    const col = wrapper.find('[data-testid="today-column"]')
    expect(col.exists()).toBe(true)
    // Width is computed from pixelsPerMs * MS_PER_DAY; just assert non-zero.
    expect(wrapper.vm.dayWidthPx).toBeGreaterThan(0)
  })

  it('does NOT render today-column when today is out of range', () => {
    const wrapper = setup('2030-01-01', '2030-01-14')
    expect(wrapper.find('[data-testid="today-column"]').exists()).toBe(false)
  })

  // FT-033 Density toggle
  describe('density prop (FT-033)', () => {
    it('density="comfortable" → effectiveRowHeight 36 / effectiveItemHeight 28', async () => {
      const wrapper = mountWithPrimeVue(GanttTimeline, {
        props: {
          units: [{ id: 1, name: 'U1', property_name: 'P1' }],
          reservations: [],
          viewStart: new Date('2026-04-15'),
          viewEnd: new Date('2026-04-28'),
          density: 'comfortable',
        },
      })
      expect(wrapper.vm.effectiveRowHeight).toBe(36)
      expect(wrapper.vm.effectiveItemHeight).toBe(28)
    })

    it('density="compact" → effectiveRowHeight 30 / effectiveItemHeight 22', async () => {
      // 30, not 28: aligned with Row's minimum 1-lane computedRowHeight
      // (max(base, 1*(item+2)+6) = max(30, 30) = 30). This keeps sidebar
      // cells in lockstep with timeline rows without transient drift.
      const wrapper = mountWithPrimeVue(GanttTimeline, {
        props: {
          units: [{ id: 1, name: 'U1', property_name: 'P1' }],
          reservations: [],
          viewStart: new Date('2026-04-15'),
          viewEnd: new Date('2026-04-28'),
          density: 'compact',
        },
      })
      expect(wrapper.vm.effectiveRowHeight).toBe(30)
      expect(wrapper.vm.effectiveItemHeight).toBe(22)
    })

    it('density defaults to comfortable when prop omitted', () => {
      const wrapper = mountWithPrimeVue(GanttTimeline, {
        props: {
          units: [{ id: 1, name: 'U1', property_name: 'P1' }],
          reservations: [],
          viewStart: new Date('2026-04-15'),
          viewEnd: new Date('2026-04-28'),
        },
      })
      expect(wrapper.vm.effectiveRowHeight).toBe(36)
    })
  })

  // FT-034 sidebar toggle badge
  describe('sidebar toggle badge (FT-034)', () => {
    it('renders kbd S badge when sidebar is expanded', () => {
      const wrapper = mountWithPrimeVue(GanttTimeline, {
        props: {
          units: [{ id: 1, name: 'U1', property_name: 'P1' }],
          reservations: [],
          viewStart: new Date('2026-04-15'),
          viewEnd: new Date('2026-04-28'),
          sidebarCollapsed: false,
        },
      })
      const badge = wrapper.find('[data-testid="kbd-sidebar"]')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('S')
      expect(badge.attributes('aria-hidden')).toBe('true')
    })

    it('hides kbd badge when sidebar is collapsed (no space in 48px corner)', () => {
      const wrapper = mountWithPrimeVue(GanttTimeline, {
        props: {
          units: [{ id: 1, name: 'U1', property_name: 'P1' }],
          reservations: [],
          viewStart: new Date('2026-04-15'),
          viewEnd: new Date('2026-04-28'),
          sidebarCollapsed: true,
        },
      })
      expect(wrapper.find('[data-testid="kbd-sidebar"]').exists()).toBe(false)
    })
  })

  it('exposes scrollToToday and scrollToDate methods', () => {
    const wrapper = setup('2026-04-15', '2026-04-28')
    expect(typeof wrapper.vm.scrollToToday).toBe('function')
    expect(typeof wrapper.vm.scrollToDate).toBe('function')
  })

  // FT-021: Timeline forwards specialMode prop to every rendered Row
  it('forwards specialMode to Row children (FT-021)', () => {
    const wrapper = setup('2026-04-15', '2026-04-28', { specialMode: 'handover' })
    const rows = wrapper.findAll('.row-stub')
    expect(rows).toHaveLength(2)
    rows.forEach((r) => expect(r.attributes('data-special-mode')).toBe('handover'))
  })

  it('specialMode defaults to empty string when prop not provided', () => {
    const wrapper = setup('2026-04-15', '2026-04-28')
    const rows = wrapper.findAll('.row-stub')
    rows.forEach((r) => expect(r.attributes('data-special-mode')).toBe(''))
  })

  // --- Bugfix: sidebar height sync from rows ---
  it('onRowHeightChanged updates rowHeights map per unit id', () => {
    const wrapper = setup('2026-04-15', '2026-04-28')
    wrapper.vm.onRowHeightChanged({ unitId: 1, height: 60 })
    expect(wrapper.vm.rowHeights[1]).toBe(60)
    wrapper.vm.onRowHeightChanged({ unitId: 2, height: 80 })
    expect(wrapper.vm.rowHeights[2]).toBe(80)
    expect(wrapper.vm.rowHeights[1]).toBe(60)
  })

  it('onRowHeightChanged ignores no-op updates', () => {
    const wrapper = setup('2026-04-15', '2026-04-28')
    wrapper.vm.onRowHeightChanged({ unitId: 1, height: 60 })
    const refBefore = wrapper.vm.rowHeights
    wrapper.vm.onRowHeightChanged({ unitId: 1, height: 60 })
    // Same value — no object reallocation (identity preserved).
    expect(wrapper.vm.rowHeights).toBe(refBefore)
  })
})
