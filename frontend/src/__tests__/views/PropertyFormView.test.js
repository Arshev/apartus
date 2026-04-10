import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/properties', () => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
}))
vi.mock('../../api/branches', () => ({
  list: vi.fn().mockResolvedValue([{ id: 1, name: 'HQ' }]),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import PropertyFormView from '../../views/PropertyFormView.vue'
import * as propertiesApi from '../../api/properties'
import * as branchesApi from '../../api/branches'

const ROUTES = [
  { path: '/properties', component: { template: '<div/>' } },
  { path: '/properties/new', name: 'PropertyNew', component: PropertyFormView },
  { path: '/properties/:id/edit', name: 'PropertyEdit', component: PropertyFormView },
]

describe('PropertyFormView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders as create mode on /properties/new', async () => {
    const wrapper = mountWithVuetify(PropertyFormView, { routes: ROUTES })
    await wrapper.vm.$router.push('/properties/new')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isEdit).toBe(false)
    expect(wrapper.text()).toContain('Новый объект')
  })

  it('loads branches on mount', async () => {
    const wrapper = mountWithVuetify(PropertyFormView, { routes: ROUTES })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(branchesApi.list).toHaveBeenCalled()
    expect(wrapper.vm.branches).toEqual([{ id: 1, name: 'HQ' }])
  })

  it('isEdit is true when route has id param, and loadProperty fetches data', async () => {
    propertiesApi.get.mockResolvedValue({
      id: 5, name: 'My Apt', address: '10 St', property_type: 'apartment', description: '', branch_id: null,
    })
    const wrapper = mountWithVuetify(PropertyFormView, { routes: ROUTES })
    // Simulate edit mode by navigating, then manually triggering load
    await wrapper.vm.$router.push('/properties/5/edit')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isEdit).toBe(true)
    // loadProperty exposed — call directly since onMounted already fired on initial route
    await wrapper.vm.loadProperty()
    expect(propertiesApi.get).toHaveBeenCalledWith('5')
    expect(wrapper.vm.form.name).toBe('My Apt')
  })

  it('sets branchesError on branch fetch failure (NEG-03 / FM-05)', async () => {
    branchesApi.list.mockRejectedValue(new Error('network'))
    const wrapper = mountWithVuetify(PropertyFormView, { routes: ROUTES })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.branchesError).toBe('Не удалось загрузить филиалы')
  })

  it('validation rules exist for required fields', () => {
    const wrapper = mountWithVuetify(PropertyFormView, { routes: ROUTES })
    expect(wrapper.vm.rules.required('')).toBe('Обязательное поле')
    expect(wrapper.vm.rules.required('x')).toBe(true)
    expect(wrapper.vm.rules.maxLength5000('x'.repeat(5001))).toBe('Максимум 5000 символов')
    expect(wrapper.vm.rules.maxLength5000('ok')).toBe(true)
  })
})
