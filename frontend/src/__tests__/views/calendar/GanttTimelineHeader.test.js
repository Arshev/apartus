import { describe, it, expect } from 'vitest'
import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import GanttTimelineHeader from '../../../views/calendar/GanttTimelineHeader.vue'
import { parseIsoDate } from '../../../utils/date'

const PIXELS_PER_MS = 100 / 86_400_000 // 100px per day

function setup(viewStart, viewEnd, totalWidth) {
  return mountWithVuetify(GanttTimelineHeader, {
    props: { viewStart, viewEnd, pixelsPerMs: PIXELS_PER_MS, totalWidth },
  })
}

describe('GanttTimelineHeader', () => {
  it('renders one top cell when range is within a single month', () => {
    const wrapper = setup(parseIsoDate('2026-04-15'), parseIsoDate('2026-04-21'), 700)
    expect(wrapper.vm.topCells).toHaveLength(1)
    expect(wrapper.findAll('.gantt-header__cell--top')).toHaveLength(1)
  })

  it('renders two top cells when range spans month boundary', () => {
    const wrapper = setup(parseIsoDate('2026-04-28'), parseIsoDate('2026-05-04'), 700)
    expect(wrapper.vm.topCells).toHaveLength(2)
  })

  it('renders N+1 day cells for an N-day inclusive range', () => {
    const wrapper = setup(parseIsoDate('2026-04-15'), parseIsoDate('2026-04-21'), 700)
    expect(wrapper.vm.bottomCells).toHaveLength(7)
    expect(wrapper.findAll('.gantt-header__cell--bottom')).toHaveLength(7)
  })

  it('flags today cell with .is-today class', async () => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)
    const wrapper = setup(start, end, 300)
    await wrapper.vm.$nextTick()
    const todayCell = wrapper.findAll('.gantt-header__cell--bottom').at(0)
    expect(todayCell.classes()).toContain('is-today')
  })

  it('flags weekend cells with .is-weekend class', async () => {
    // 2026-04-18 is Saturday
    const wrapper = setup(parseIsoDate('2026-04-17'), parseIsoDate('2026-04-20'), 400)
    await wrapper.vm.$nextTick()
    const cells = wrapper.findAll('.gantt-header__cell--bottom')
    expect(cells.at(0).classes()).not.toContain('is-weekend') // Fri
    expect(cells.at(1).classes()).toContain('is-weekend') // Sat
    expect(cells.at(2).classes()).toContain('is-weekend') // Sun
    expect(cells.at(3).classes()).not.toContain('is-weekend') // Mon
  })

  it('day cell width = pixelsPerMs * msPerDay', () => {
    const wrapper = setup(parseIsoDate('2026-04-15'), parseIsoDate('2026-04-21'), 700)
    expect(wrapper.vm.dayCellWidth).toBeCloseTo(100)
  })
})
