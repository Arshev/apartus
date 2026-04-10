import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/reservations', () => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
  checkIn: vi.fn(), checkOut: vi.fn(), cancel: vi.fn(),
}))

import * as api from '../../api/reservations'
import { useReservationsStore } from '../../stores/reservations'

const R1 = { id: 1, status: 'confirmed', unit_name: 'R1' }
const R2 = { id: 2, status: 'checked_in', unit_name: 'R2' }

describe('useReservationsStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('fetchAll', async () => {
    api.list.mockResolvedValue([R1, R2])
    const store = useReservationsStore()
    await store.fetchAll()
    expect(store.items).toEqual([R1, R2])
  })

  it('fetchAll error', async () => {
    api.list.mockRejectedValue({ response: { data: { error: 'fail' } } })
    const store = useReservationsStore()
    await store.fetchAll()
    expect(store.error).toBe('fail')
  })

  it('create', async () => {
    api.create.mockResolvedValue(R1)
    const store = useReservationsStore()
    await store.create({ unit_id: 1 })
    expect(store.items).toContainEqual(R1)
  })

  it('update replaces', async () => {
    api.list.mockResolvedValue([R1])
    api.update.mockResolvedValue({ ...R1, notes: 'x' })
    const store = useReservationsStore()
    await store.fetchAll()
    await store.update(1, { notes: 'x' })
    expect(store.items[0].notes).toBe('x')
  })

  it('destroy', async () => {
    api.list.mockResolvedValue([R1, R2])
    api.destroy.mockResolvedValue({})
    const store = useReservationsStore()
    await store.fetchAll()
    await store.destroy(1)
    expect(store.items).toEqual([R2])
  })

  it('checkIn updates item', async () => {
    api.list.mockResolvedValue([R1])
    api.checkIn.mockResolvedValue({ ...R1, status: 'checked_in' })
    const store = useReservationsStore()
    await store.fetchAll()
    await store.checkIn(1)
    expect(store.items[0].status).toBe('checked_in')
  })

  it('checkOut updates item', async () => {
    api.list.mockResolvedValue([R2])
    api.checkOut.mockResolvedValue({ ...R2, status: 'checked_out' })
    const store = useReservationsStore()
    await store.fetchAll()
    await store.checkOut(2)
    expect(store.items[0].status).toBe('checked_out')
  })

  it('cancelReservation updates item', async () => {
    api.list.mockResolvedValue([R1])
    api.cancel.mockResolvedValue({ ...R1, status: 'cancelled' })
    const store = useReservationsStore()
    await store.fetchAll()
    await store.cancelReservation(1)
    expect(store.items[0].status).toBe('cancelled')
  })

  it('checkIn error sets error', async () => {
    api.checkIn.mockRejectedValue({ response: { data: { error: 'bad transition' } } })
    const store = useReservationsStore()
    await expect(store.checkIn(1)).rejects.toBeDefined()
    expect(store.error).toBe('bad transition')
  })
})
