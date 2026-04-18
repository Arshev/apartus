import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import ReservationDateRangePicker from '../../components/ReservationDateRangePicker.vue'

describe('ReservationDateRangePicker (FT-036 P6)', () => {
  it('displayText empty when no dates (placeholder lives in DatePicker)', () => {
    const wrapper = mountWithPrimeVue(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    expect(wrapper.vm.displayText).toBe('')
  })

  it('displayText shows nights count when both dates set', () => {
    const wrapper = mountWithPrimeVue(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-20' } },
    })
    // Format: "5 ночей" (pluralization) — no longer date format
    expect(wrapper.vm.nightsCount).toBe(5)
    expect(wrapper.vm.displayText).toContain('5')
  })

  it('nightsCount is 0 if check_out == check_in', () => {
    const wrapper = mountWithPrimeVue(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-15' } },
    })
    expect(wrapper.vm.nightsCount).toBe(0)
  })

  it('emits update:modelValue on PrimeVue DatePicker [start, end] select', async () => {
    const wrapper = mountWithPrimeVue(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    // PrimeVue range DatePicker emits [Date, Date] (only start/end, not all dates)
    const dates = [new Date('2026-04-15T00:00:00Z'), new Date('2026-04-20T00:00:00Z')]
    wrapper.vm.onRangeChange(dates)
    await nextTick()
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual({ checkIn: '2026-04-15', checkOut: '2026-04-20' })
  })

  it('does not emit on mid-pick (second date null)', async () => {
    const wrapper = mountWithPrimeVue(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    wrapper.vm.onRangeChange([new Date('2026-04-15T00:00:00Z'), null])
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('does not emit on < 2 dates', async () => {
    const wrapper = mountWithPrimeVue(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    wrapper.vm.onRangeChange([new Date('2026-04-15T00:00:00Z')])
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('pickerValue returns [start, end] array when dates set', () => {
    const wrapper = mountWithPrimeVue(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-18' } },
    })
    const dates = wrapper.vm.pickerValue
    expect(dates).toHaveLength(2)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-04-15')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-04-18')
  })

  it('pickerValue returns empty array when dates missing', () => {
    const wrapper = mountWithPrimeVue(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    expect(wrapper.vm.pickerValue).toEqual([])
  })
})
