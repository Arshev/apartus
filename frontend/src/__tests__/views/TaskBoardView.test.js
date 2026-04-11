import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/tasks', () => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({ id: 1, status: 'in_progress' }),
  destroy: vi.fn().mockResolvedValue({}),
}))

import { mountWithVuetify } from '../helpers/mountWithVuetify'
import TaskBoardView from '../../views/TaskBoardView.vue'
import { useTasksStore } from '../../stores/tasks'

describe('TaskBoardView', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('has 3 columns', () => {
    const wrapper = mountWithVuetify(TaskBoardView)
    expect(wrapper.vm.columns).toHaveLength(3)
    expect(wrapper.vm.columns.map((c) => c.status)).toEqual(['pending', 'in_progress', 'completed'])
  })

  it('priorityColor maps correctly', () => {
    const wrapper = mountWithVuetify(TaskBoardView)
    expect(wrapper.vm.priorityColor('urgent')).toBe('red')
    expect(wrapper.vm.priorityColor('high')).toBe('orange')
    expect(wrapper.vm.priorityColor('medium')).toBe('blue')
    expect(wrapper.vm.priorityColor('low')).toBe('grey')
  })

  it('openCreate resets form', () => {
    const wrapper = mountWithVuetify(TaskBoardView)
    wrapper.vm.openCreate()
    expect(wrapper.vm.editing).toBeNull()
    expect(wrapper.vm.form.priority).toBe('medium')
  })

  it('openEdit fills form', () => {
    const wrapper = mountWithVuetify(TaskBoardView)
    wrapper.vm.openEdit({ id: 1, title: 'Clean', priority: 'high', category: 'cleaning', due_date: '2026-04-15', description: 'x' })
    expect(wrapper.vm.editing.id).toBe(1)
    expect(wrapper.vm.form.title).toBe('Clean')
  })

  it('moveForward calls store.update with next status', async () => {
    const wrapper = mountWithVuetify(TaskBoardView)
    const store = useTasksStore()
    vi.spyOn(store, 'update').mockResolvedValue({})
    await wrapper.vm.moveForward({ id: 1, status: 'pending' })
    expect(store.update).toHaveBeenCalledWith(1, { status: 'in_progress' })
  })

  it('confirmDelete + handleDelete', async () => {
    const wrapper = mountWithVuetify(TaskBoardView)
    const store = useTasksStore()
    vi.spyOn(store, 'destroy')
    wrapper.vm.confirmDelete({ id: 1 })
    await wrapper.vm.handleDelete()
    expect(store.destroy).toHaveBeenCalledWith(1)
  })
})
