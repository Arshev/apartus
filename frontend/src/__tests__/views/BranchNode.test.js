import { describe, it, expect } from 'vitest'
import { mountWithPrimeVue } from '../helpers/mountWithPrimeVue'
import BranchNode from '../../views/BranchNode.vue'

describe('BranchNode (FT-036 P2)', () => {
  const node = {
    id: 1,
    name: 'Root Branch',
    children: [
      { id: 2, name: 'Child Branch', children: [] },
    ],
  }

  function mount(props = {}) {
    return mountWithPrimeVue(BranchNode, {
      props: { node, depth: 0, ...props },
    })
  }

  it('renders node name', () => {
    const wrapper = mount()
    expect(wrapper.text()).toContain('Root Branch')
  })

  it('renders with correct depth padding', () => {
    const wrapper = mount({ depth: 2 })
    const div = wrapper.find('div')
    expect(div.attributes('style')).toContain('padding-left: 48px')
  })

  it('starts expanded by default', () => {
    const wrapper = mount()
    expect(wrapper.vm.expanded).toBe(true)
  })

  it('renders children when expanded (auto-recursion)', () => {
    const wrapper = mount()
    expect(wrapper.text()).toContain('Child Branch')
  })

  it('emits addChild with node id on add button', async () => {
    const wrapper = mount()
    const addBtn = wrapper.find('button[title="Добавить дочерний"]')
    expect(addBtn.exists()).toBe(true)
    await addBtn.trigger('click')
    expect(wrapper.emitted('addChild')).toEqual([[1]])
  })
})
