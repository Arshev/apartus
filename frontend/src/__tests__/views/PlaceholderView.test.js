import { describe, it, expect } from 'vitest'
import { mountWithVuetify } from '../helpers/mountWithVuetify'
import PlaceholderView from '../../views/PlaceholderView.vue'

describe('PlaceholderView', () => {
  it('renders «Скоро» empty state', async () => {
    const wrapper = mountWithVuetify(PlaceholderView, {
      routes: [{ path: '/properties', component: PlaceholderView }],
    })
    await wrapper.vm.$router.push('/properties')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Скоро')
    expect(wrapper.text()).toContain('Properties')
  })
})
