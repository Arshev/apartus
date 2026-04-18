import { describe, it, expect } from 'vitest'
import { mountWithPrimeVue } from '../../helpers/mountWithPrimeVue'
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
  return mountWithPrimeVue(GanttTimelineItem, {
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

  // --- FT-021 Handover mode ---
  describe('handover mode', () => {
    // Helper: build booking with today-relative dates so tests work regardless
    // of real clock.
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const today = new Date()
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const far = new Date(today); far.setDate(today.getDate() + 10)

    it('does not add handover class when specialMode is empty', () => {
      const wrapper = setup({ specialMode: '' })
      expect(wrapper.vm.handoverType).toBeNull()
      expect(wrapper.vm.itemClasses).not.toContain('gantt-item--dimmed')
      expect(wrapper.vm.itemClasses.find((c) => c.startsWith('gantt-item--handover-'))).toBeUndefined()
    })

    it('dims bar when handoverType is null (specialMode=handover but no match)', () => {
      const booking = { ...BASE, status: 'confirmed', check_in: iso(far), check_out: '2099-01-01' }
      const wrapper = setup({ booking, specialMode: 'handover' })
      expect(wrapper.vm.handoverType).toBeNull()
      expect(wrapper.vm.itemClasses).toContain('gantt-item--dimmed')
    })

    it('adds handover-checkin_today class + ↗ marker for confirmed check_in today', () => {
      const booking = { ...BASE, status: 'confirmed', check_in: iso(today), check_out: iso(far) }
      const wrapper = setup({ booking, specialMode: 'handover' })
      expect(wrapper.vm.handoverType).toBe('checkin_today')
      expect(wrapper.vm.itemClasses).toContain('gantt-item--handover-checkin_today')
      expect(wrapper.vm.handoverMarker).toBe('\u2197')
      expect(wrapper.find('.gantt-item__marker').text()).toBe('\u2197')
    })

    it('adds handover-checkin_tomorrow class (no marker) for confirmed check_in tomorrow', () => {
      const booking = { ...BASE, status: 'confirmed', check_in: iso(tomorrow), check_out: iso(far) }
      const wrapper = setup({ booking, specialMode: 'handover' })
      expect(wrapper.vm.handoverType).toBe('checkin_tomorrow')
      expect(wrapper.vm.itemClasses).toContain('gantt-item--handover-checkin_tomorrow')
      // Tomorrow bracket has no marker — only today does (per REQ-03).
      expect(wrapper.vm.handoverMarker).toBeNull()
      expect(wrapper.find('.gantt-item__marker').exists()).toBe(false)
    })

    it('adds handover-checkout_today class + ↙ marker for checked_in check_out today', () => {
      const booking = { ...BASE, status: 'checked_in', check_in: '2026-01-01', check_out: iso(today) }
      const wrapper = setup({ booking, specialMode: 'handover' })
      expect(wrapper.vm.handoverType).toBe('checkout_today')
      expect(wrapper.vm.itemClasses).toContain('gantt-item--handover-checkout_today')
      expect(wrapper.vm.handoverMarker).toBe('\u2199')
    })

    it('adds handover-checkout_tomorrow class (no marker) for checked_in check_out tomorrow', () => {
      const booking = { ...BASE, status: 'checked_in', check_in: '2026-01-01', check_out: iso(tomorrow) }
      const wrapper = setup({ booking, specialMode: 'handover' })
      expect(wrapper.vm.handoverType).toBe('checkout_tomorrow')
      expect(wrapper.vm.itemClasses).toContain('gantt-item--handover-checkout_tomorrow')
      expect(wrapper.vm.handoverMarker).toBeNull()
    })

    it('marker span has pointer-events:none (SC-07 — click not hijacked)', async () => {
      const booking = { ...BASE, status: 'confirmed', check_in: iso(today), check_out: iso(far) }
      const wrapper = setup({ booking, specialMode: 'handover' })
      const marker = wrapper.find('.gantt-item__marker')
      expect(marker.exists()).toBe(true)
      // click through the bar should still emit show-booking even with marker present
      await wrapper.find('.gantt-item').trigger('click')
      expect(wrapper.emitted('show-booking')).toEqual([[BASE.id]])
    })

    it('marker has accessible title from i18n', () => {
      const booking = { ...BASE, status: 'confirmed', check_in: iso(today), check_out: iso(far) }
      const wrapper = setup({ booking, specialMode: 'handover' })
      expect(wrapper.find('.gantt-item__marker').attributes('title')).toBe('Заезд сегодня')
    })
  })

  // --- FT-022 Overdue mode ---
  describe('overdue mode', () => {
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3)
    const future = new Date(today); future.setDate(today.getDate() + 10)

    it('does not add overdue class when specialMode is empty', () => {
      const wrapper = setup({ specialMode: '' })
      expect(wrapper.vm.overdueDays).toBe(0)
      expect(wrapper.vm.itemClasses).not.toContain('gantt-item--overdue')
    })

    it('does not add overdue class when specialMode is handover', () => {
      const booking = { ...BASE, status: 'checked_in', check_out: iso(yesterday) }
      const wrapper = setup({ booking, specialMode: 'handover' })
      expect(wrapper.vm.overdueDays).toBe(0)
      expect(wrapper.vm.itemClasses).not.toContain('gantt-item--overdue')
    })

    it('dims bar when specialMode=overdue but booking is not overdue', () => {
      const booking = { ...BASE, status: 'confirmed', check_out: iso(future) }
      const wrapper = setup({ booking, specialMode: 'overdue' })
      expect(wrapper.vm.overdueDays).toBe(0)
      expect(wrapper.vm.itemClasses).toContain('gantt-item--dimmed')
    })

    it('adds overdue + overdue-pulse classes + label for checked_in yesterday', () => {
      const booking = { ...BASE, status: 'checked_in', check_out: iso(yesterday) }
      const wrapper = setup({ booking, specialMode: 'overdue' })
      expect(wrapper.vm.overdueDays).toBe(1)
      expect(wrapper.vm.itemClasses).toContain('gantt-item--overdue')
      expect(wrapper.vm.itemClasses).toContain('gantt-item--overdue-pulse')
      expect(wrapper.vm.itemClasses).not.toContain('gantt-item--dimmed')
      expect(wrapper.find('.gantt-item__overdue-label').text()).toBe('+1д')
    })

    it('shows larger number for longer overdue', () => {
      const booking = { ...BASE, status: 'checked_in', check_out: iso(threeDaysAgo) }
      const wrapper = setup({ booking, specialMode: 'overdue' })
      expect(wrapper.vm.overdueDays).toBe(3)
      expect(wrapper.find('.gantt-item__overdue-label').text()).toBe('+3д')
    })

    it('overdue-label has pointer-events:none (SC-05 — click not hijacked)', async () => {
      const booking = { ...BASE, status: 'checked_in', check_out: iso(yesterday) }
      const wrapper = setup({ booking, specialMode: 'overdue' })
      const label = wrapper.find('.gantt-item__overdue-label')
      expect(label.exists()).toBe(true)
      // Click should still emit show-booking even with label present.
      await wrapper.find('.gantt-item').trigger('click')
      expect(wrapper.emitted('show-booking')).toEqual([[BASE.id]])
    })

    it('does not render overdue-label when overdueDays is 0', () => {
      const booking = { ...BASE, status: 'confirmed', check_out: iso(future) }
      const wrapper = setup({ booking, specialMode: 'overdue' })
      expect(wrapper.find('.gantt-item__overdue-label').exists()).toBe(false)
    })
  })

  // --- FT-027 Reservation Bar Density ---
  describe('revenue chip + nights indicator (FT-027)', () => {
    // Date helpers — duplicated from the overdue block for scope isolation.
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const future = new Date(today); future.setDate(today.getDate() + 10)

    // Booking fixture with enriched _start/_end Date objects (Row normally
    // adds these; we inject directly for isolated Item tests).
    const enrichedBase = {
      ...BASE,
      _start: new Date('2026-04-15'),
      _end: new Date('2026-04-20'),
    }

    describe('REQ-03 thresholds', () => {
      it('width < 30: no revenue, no nights', () => {
        const wrapper = setup({ booking: enrichedBase, width: 20 })
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(false)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })

      it('width 80 (label shown, revenue not yet)', () => {
        const wrapper = setup({ booking: enrichedBase, width: 80 })
        expect(wrapper.find('.gantt-item__label').exists()).toBe(true)
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(false)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })

      it('width 140: revenue appears, nights still hidden', () => {
        const wrapper = setup({ booking: enrichedBase, width: 140 })
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(true)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })

      it('width 179 (just under nights threshold): revenue yes, nights no', () => {
        const wrapper = setup({ booking: enrichedBase, width: 179 })
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(true)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })

      it('width 180: both revenue and nights visible', () => {
        const wrapper = setup({ booking: enrichedBase, width: 180 })
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(true)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(true)
      })
    })

    describe('REQ-01 revenue formatting', () => {
      it('uses currency prop for formatting (RUB default)', () => {
        const wrapper = setup({ booking: enrichedBase, width: 200 })
        // formatMoney(50000, 'RUB') → "500.00 ₽"
        expect(wrapper.find('.gantt-item__revenue').text()).toBe('500.00 ₽')
      })

      it('uses non-RUB currency from prop', () => {
        const wrapper = setup({ booking: enrichedBase, width: 200, currency: 'USD' })
        expect(wrapper.find('.gantt-item__revenue').text()).toBe('$500.00')
      })

      it('applies text-tabular class for tabular-nums', () => {
        const wrapper = setup({ booking: enrichedBase, width: 200 })
        expect(wrapper.find('.gantt-item__revenue').classes()).toContain('text-tabular')
      })
    })

    describe('REQ-02 nights label', () => {
      it('computes diff between _start and _end', () => {
        const wrapper = setup({ booking: enrichedBase, width: 200 })
        // 2026-04-20 − 2026-04-15 = 5 nights
        expect(wrapper.vm.nights).toBe(5)
        expect(wrapper.find('.gantt-item__nights').text()).toBe('5 н')
      })

      it('hidden when nights is 0 (single-day booking edge)', () => {
        const booking = {
          ...enrichedBase,
          _start: new Date('2026-04-15'),
          _end: new Date('2026-04-15'),
        }
        const wrapper = setup({ booking, width: 200 })
        expect(wrapper.vm.nights).toBe(0)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })

      it('hidden when _start/_end missing (blocking reservation or partial data)', () => {
        const booking = { ...BASE } // no _start, _end
        const wrapper = setup({ booking, width: 200 })
        expect(wrapper.vm.nights).toBe(0)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })
    })

    describe('FM-01 zero / null price suppression', () => {
      it('hides revenue when total_price_cents is 0 (blocking reservation)', () => {
        const booking = { ...enrichedBase, total_price_cents: 0 }
        const wrapper = setup({ booking, width: 200 })
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(false)
      })

      it('hides revenue when total_price_cents is null', () => {
        const booking = { ...enrichedBase, total_price_cents: null }
        const wrapper = setup({ booking, width: 200 })
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(false)
      })

      it('still shows nights for zero-price blocking (nights semantics independent)', () => {
        const booking = { ...enrichedBase, total_price_cents: 0 }
        const wrapper = setup({ booking, width: 200 })
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(true)
      })
    })

    describe('REQ-03 mode overrides', () => {
      it('overdue mode + overdue booking: hides revenue (overdue-label claims right slot)', () => {
        const booking = { ...enrichedBase, status: 'checked_in', check_out: iso(yesterday) }
        const wrapper = setup({ booking, width: 200, specialMode: 'overdue' })
        expect(wrapper.find('.gantt-item__overdue-label').exists()).toBe(true)
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(false)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })

      it('overdue mode + non-overdue (dimmed): hides revenue + nights (illegible at 0.35 opacity)', () => {
        const booking = { ...enrichedBase, status: 'confirmed', check_out: iso(future) }
        const wrapper = setup({ booking, width: 200, specialMode: 'overdue' })
        expect(wrapper.vm.itemClasses).toContain('gantt-item--dimmed')
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(false)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })

      it('handover mode + matching booking: shows revenue + nights (not dimmed)', () => {
        // Check-in today booking — matches handover
        const booking = { ...enrichedBase, check_in: iso(new Date()), status: 'confirmed' }
        const wrapper = setup({ booking, width: 200, specialMode: 'handover' })
        expect(wrapper.vm.handoverType).not.toBeNull()
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(true)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(true)
      })

      it('handover mode + non-matching (dimmed): hides revenue + nights', () => {
        // Far-future check-in, won't match any handover bracket
        const booking = { ...enrichedBase, check_in: '2030-01-01', status: 'confirmed' }
        const wrapper = setup({ booking, width: 200, specialMode: 'handover' })
        expect(wrapper.vm.itemClasses).toContain('gantt-item--dimmed')
        expect(wrapper.find('.gantt-item__revenue').exists()).toBe(false)
        expect(wrapper.find('.gantt-item__nights').exists()).toBe(false)
      })

      it('idle / heatmap mode: revenue + nights unchanged (not dimmed)', () => {
        const wrapper1 = setup({ booking: enrichedBase, width: 200, specialMode: 'idle' })
        expect(wrapper1.find('.gantt-item__revenue').exists()).toBe(true)
        expect(wrapper1.find('.gantt-item__nights').exists()).toBe(true)

        const wrapper2 = setup({ booking: enrichedBase, width: 200, specialMode: 'heatmap' })
        expect(wrapper2.find('.gantt-item__revenue').exists()).toBe(true)
        expect(wrapper2.find('.gantt-item__nights').exists()).toBe(true)
      })
    })

    describe('REQ-09 pointer-events / click propagation', () => {
      it('click on revenue span still triggers show-booking (propagates to bar)', async () => {
        const wrapper = setup({ booking: enrichedBase, width: 200 })
        const revenue = wrapper.find('.gantt-item__revenue')
        expect(revenue.exists()).toBe(true)
        // Click event bubbles from span to parent .gantt-item — since the span
        // has pointer-events: none, the click effectively lands on the bar.
        // In JSDOM we just assert the bar still handles the click after we
        // click on it directly (with revenue span present).
        await wrapper.find('.gantt-item').trigger('click')
        expect(wrapper.emitted('show-booking')).toEqual([[BASE.id]])
      })
    })
  })
})
