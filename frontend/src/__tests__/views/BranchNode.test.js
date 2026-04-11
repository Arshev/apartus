import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import BranchNode from '../../views/BranchNode.vue'

describe('BranchNode', () => {
  const node = {
    id: 1,
    name: 'Root Branch',
    children: [
      { id: 2, name: 'Child Branch', children: [] },
    ],
  }

  function mount(props = {}) {
    return mountWithVuetify(BranchNode, {
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

  it('renders children when expanded', () => {
    const wrapper = mount()
    expect(wrapper.text()).toContain('Child Branch')
  })

  it('has correct emits declared', () => {
    expect(BranchNode.emits).toEqual(['edit', 'delete', 'addChild'])
  })

  it('accepts node as required prop', () => {
    expect(BranchNode.props.node.required).toBe(true)
  })

  it('depth defaults to 0', () => {
    expect(BranchNode.props.depth.default).toBe(0)
  })
})
