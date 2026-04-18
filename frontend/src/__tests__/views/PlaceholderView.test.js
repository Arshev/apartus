import { describe, it, expect } from 'vitest'
import { mountWithPrimeVueAsync } from '../helpers/mountWithPrimeVue'
import PlaceholderView from '../../views/PlaceholderView.vue'

describe('PlaceholderView (FT-036 P0 smoke)', () => {
  async function mount(path = '/properties') {
    return mountWithPrimeVueAsync(PlaceholderView, {
      routes: [{ path, component: PlaceholderView }],
      initialRoute: path,
    })
  }

  it('renders localized title and path-aware text', async () => {
    const wrapper = await mount('/properties')
    expect(wrapper.text()).toContain('Скоро')
    expect(wrapper.text()).toContain('Properties')
  })

  it('Zod smoke validation — short input emits error', async () => {
    const wrapper = await mount()
    wrapper.vm.validateSmoke('a')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.smokeError).toMatch(/2 chars/)
  })

  it('Zod smoke validation — valid input clears error', async () => {
    const wrapper = await mount()
    wrapper.vm.validateSmoke('hello')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.smokeError).toBe('')
  })

  it('Zod smoke validation — empty input clears error', async () => {
    const wrapper = await mount()
    wrapper.vm.validateSmoke('abc')
    wrapper.vm.validateSmoke('')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.smokeError).toBe('')
  })

  it('toggleDark flips isDark state', async () => {
    const wrapper = await mount()
    const initial = wrapper.vm.isDark
    wrapper.vm.toggleDark()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isDark).toBe(!initial)
    // Reset to avoid leakage between tests
    wrapper.vm.toggleDark()
  })

  it('PrimeVue Button renders', async () => {
    const wrapper = await mount()
    expect(wrapper.find('button').exists()).toBe(true)
  })
})
