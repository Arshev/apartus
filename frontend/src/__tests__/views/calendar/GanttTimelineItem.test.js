import { describe, it, expect } from 'vitest'
import { mountWithVuetify } from '../../helpers/mountWithVuetify'
import GanttTimelineItem from '../../../views/calendar/GanttTimelineItem.vue'

const BASE = {
  id: 42,
  guest_name: 'Иван Петров',
  check_in: '2026-04-15',
  check_out: '2026-04-20',
  status: 'confirmed',
  total_price_cents: 50000,
}

function setup(propsOverride = {}) {
  return mountWithVuetify(GanttTimelineItem, {
    props: { booking: BASE, left: 100, width: 200, lane: 0, itemHeight: 28, ...propsOverride },
  })
}

describe('GanttTimelineItem', () => {
  it('positions absolutely via inline style', () => {
    const wrapper = setup({ left: 150, width: 300, lane: 2, itemHeight: 24 })
    const style = wrapper.vm.itemStyle
    expect(style.left).toBe('150px')
    expect(style.width).toBe('300px')
    expect(style.height).toBe('24px')
    // top = 3 + lane * (itemHeight + 2) = 3 + 2 * 26 = 55
    expect(style.top).toBe('55px')
  })

  it('clamps width to minimum 4px', () => {
    const wrapper = setup({ width: 1 })
    expect(wrapper.vm.itemStyle.width).toBe('4px')
  })

  it('applies status-specific class for color mapping', () => {
    expect(setup({ booking: { ...BASE, status: 'confirmed' } }).find('.gantt-item--confirmed').exists()).toBe(true)
    expect(setup({ booking: { ...BASE, status: 'checked_in' } }).find('.gantt-item--checked_in').exists()).toBe(true)
    expect(setup({ booking: { ...BASE, status: 'checked_out' } }).find('.gantt-item--checked_out').exists()).toBe(true)
    expect(setup({ booking: { ...BASE, status: 'cancelled' } }).find('.gantt-item--cancelled').exists()).toBe(true)
  })

  it('hides label when width < 30', () => {
    const wrapper = setup({ width: 20 })
    expect(wrapper.vm.showLabel).toBe(false)
    expect(wrapper.find('.gantt-item__label').exists()).toBe(false)
  })

  it('shows #id when 30 <= width < 80', () => {
    const wrapper = setup({ width: 50 })
    expect(wrapper.vm.label).toBe('#42')
  })

  it('shows guest_name when width >= 80', () => {
    const wrapper = setup({ width: 200 })
    expect(wrapper.vm.label).toBe('Иван Петров')
  })

  it('falls back to #id when guest_name is null', () => {
    const wrapper = setup({ booking: { ...BASE, guest_name: null }, width: 200 })
    expect(wrapper.vm.label).toBe('#42')
  })

  it('emits show-booking with id on click', async () => {
    const wrapper = setup()
    await wrapper.find('.gantt-item').trigger('click')
    expect(wrapper.emitted('show-booking')).toEqual([[42]])
  })

  it('emits show-tooltip with booking + coords on mouseenter', async () => {
    const wrapper = setup()
    await wrapper.find('.gantt-item').trigger('mouseenter', { clientX: 123, clientY: 456 })
    const events = wrapper.emitted('show-tooltip')
    expect(events).toHaveLength(1)
    expect(events[0][0]).toMatchObject({ booking: BASE, x: 123, y: 456 })
  })

  it('emits hide-tooltip on mouseleave', async () => {
    const wrapper = setup()
    await wrapper.find('.gantt-item').trigger('mouseleave')
    expect(wrapper.emitted('hide-tooltip')).toEqual([[]])
  })

  it('emits context-menu with booking + coords on contextmenu (right-click)', async () => {
    const wrapper = setup()
    await wrapper.find('.gantt-item').trigger('contextmenu', { clientX: 99, clientY: 88 })
    const events = wrapper.emitted('context-menu')
    expect(events).toHaveLength(1)
    expect(events[0][0]).toMatchObject({ booking: BASE, x: 99, y: 88 })
  })
})
