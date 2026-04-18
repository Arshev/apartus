import { describe, it, expect } from 'vitest'
import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ReservationFormSection from '../../components/ReservationFormSection.vue'

describe('ReservationFormSection', () => {
  it('renders title in h2 with provided id', () => {
    const wrapper = mountWithVuetify(ReservationFormSection, {
      props: { title: 'Юнит и даты', id: 'section-unit' },
      slots: { default: '<p>content</p>' },
    })
    const h2 = wrapper.find('h2')
    expect(h2.exists()).toBe(true)
    expect(h2.text()).toBe('Юнит и даты')
    expect(h2.attributes('id')).toBe('section-unit')
  })

  it('section has aria-labelledby matching heading id', () => {
    const wrapper = mountWithVuetify(ReservationFormSection, {
      props: { title: 'Гость', id: 'section-guest' },
      slots: { default: '<span>x</span>' },
    })
    expect(wrapper.find('section').attributes('aria-labelledby')).toBe('section-guest')
  })

  it('renders slot content', () => {
    const wrapper = mountWithVuetify(ReservationFormSection, {
      props: { title: 'X', id: 'x' },
      slots: { default: '<div class="slot-content">hi</div>' },
    })
    expect(wrapper.find('.slot-content').text()).toBe('hi')
  })

  it('auto-generates id when not provided', () => {
    const wrapper = mountWithVuetify(ReservationFormSection, {
      props: { title: 'Заметки' },
      slots: { default: ' ' },
    })
    const id = wrapper.find('h2').attributes('id')
    expect(id).toMatch(/^section-/)
    expect(wrapper.find('section').attributes('aria-labelledby')).toBe(id)
  })
})
