import { describe, it, expect } from 'vitest'
import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import ReservationPriceSummary from '../../components/ReservationPriceSummary.vue'

const baseProps = {
  checkIn: '2026-04-15',
  checkOut: '2026-04-20',
  unitId: 1,
  basePriceCents: 500000,
  seasonalPrices: [],
  currency: 'RUB',
  autoTotalCents: 2500000,
  manualTotalCents: 2500000,
  manualOverride: false,
}

describe('ReservationPriceSummary', () => {
  it('shows empty state when unitId null', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: { ...baseProps, unitId: null },
    })
    expect(wrapper.text()).toContain('Выберите юнит и даты')
  })

  it('shows empty state when dates missing', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: { ...baseProps, checkIn: '', checkOut: '' },
    })
    expect(wrapper.text()).toContain('Выберите юнит и даты')
  })

  it('breakdown shows single base bucket when no seasonals apply', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: baseProps,
    })
    expect(wrapper.vm.breakdown).toHaveLength(1)
    expect(wrapper.vm.breakdown[0]).toMatchObject({
      nights: 5,
      priceCents: 500000,
      seasonal: false,
    })
  })

  it('breakdown shows 2 buckets when seasonal straddles range', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: {
        ...baseProps,
        checkIn: '2026-04-29',
        checkOut: '2026-05-04',
        seasonalPrices: [
          { id: 1, start_date: '2026-05-01', end_date: '2026-05-11', price_cents: 700000 },
        ],
        autoTotalCents: 2 * 500000 + 3 * 700000,
        manualTotalCents: 2 * 500000 + 3 * 700000,
      },
    })
    const rows = wrapper.vm.breakdown
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => !r.seasonal)).toMatchObject({ nights: 2, priceCents: 500000 })
    expect(rows.find((r) => r.seasonal)).toMatchObject({ nights: 3, priceCents: 700000 })
  })

  it('shows manual override chip when manualOverride true и суммы отличаются', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: {
        ...baseProps,
        manualOverride: true,
        manualTotalCents: 2000000,
        autoTotalCents: 2500000,
      },
    })
    expect(wrapper.text()).toContain('Ручная цена')
  })

  it('does not show manual chip when manualOverride true but sums equal', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: {
        ...baseProps,
        manualOverride: true,
        manualTotalCents: 2500000,
        autoTotalCents: 2500000,
      },
    })
    expect(wrapper.text()).not.toContain('Ручная цена')
  })

  it('emits recalc when button clicked', async () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: {
        ...baseProps,
        manualOverride: true,
        manualTotalCents: 2000000,
        autoTotalCents: 2500000,
      },
    })
    await wrapper.find('[data-testid="recalc-btn"]').trigger('click')
    expect(wrapper.emitted('recalc')).toHaveLength(1)
  })

  it('breakdown is empty when checkOut <= checkIn', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: { ...baseProps, checkIn: '2026-04-15', checkOut: '2026-04-15' },
    })
    expect(wrapper.vm.breakdown).toHaveLength(0)
  })

  it('root region has aria-live="polite"', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, { props: baseProps })
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
  })

  it('effectiveTotal uses autoTotal when no manual override', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: {
        ...baseProps,
        manualOverride: false,
        autoTotalCents: 2500000,
        manualTotalCents: 2000000,
      },
    })
    expect(wrapper.vm.effectiveTotal).toBe(2500000)
  })

  it('effectiveTotal uses manualTotal when override active', () => {
    const wrapper = mountWithPrimeVue(ReservationPriceSummary, {
      props: {
        ...baseProps,
        manualOverride: true,
        autoTotalCents: 2500000,
        manualTotalCents: 2000000,
      },
    })
    expect(wrapper.vm.effectiveTotal).toBe(2000000)
  })
})
