import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ReservationDateRangePicker from '../../components/ReservationDateRangePicker.vue'

describe('ReservationDateRangePicker', () => {
  it('shows placeholder when no dates', () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    expect(wrapper.vm.displayText).toMatch(/datesPlaceholder/)
  })

  it('formats range and nights count when both dates set', () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-20' } },
    })
    const text = wrapper.vm.displayText
    expect(text).toContain('15')
    expect(text).toContain('20')
    expect(wrapper.vm.nightsCount).toBe(5)
  })

  it('nightsCount is 0 if check_out == check_in', () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-15' } },
    })
    expect(wrapper.vm.nightsCount).toBe(0)
  })

  it('emits update:modelValue with normalized checkIn/checkOut on range select', async () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    // Simulate v-date-picker emit Date[] for 15..20 inclusive
    const dates = [
      new Date('2026-04-15T00:00:00Z'),
      new Date('2026-04-16T00:00:00Z'),
      new Date('2026-04-17T00:00:00Z'),
      new Date('2026-04-18T00:00:00Z'),
      new Date('2026-04-19T00:00:00Z'),
      new Date('2026-04-20T00:00:00Z'),
    ]
    wrapper.vm.onRangeChange(dates)
    await nextTick()
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual({ checkIn: '2026-04-15', checkOut: '2026-04-20' })
  })

  it('does not emit when range has < 2 dates (incomplete selection)', async () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    wrapper.vm.onRangeChange([new Date('2026-04-15T00:00:00Z')])
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('popup has role="dialog" when opened (via v-menu stub)', async () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-20' } },
    })
    wrapper.vm.menuOpen = true
    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('pickerValue returns Date[] inclusive range when dates set', () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-18' } },
    })
    const dates = wrapper.vm.pickerValue
    expect(dates).toHaveLength(4) // 15, 16, 17, 18 inclusive
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-04-15')
    expect(dates[3].toISOString().slice(0, 10)).toBe('2026-04-18')
  })

  it('pickerValue returns empty array when dates missing', () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    expect(wrapper.vm.pickerValue).toEqual([])
  })
})
