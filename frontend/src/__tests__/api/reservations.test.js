import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/reservations'

describe('api/reservations', () => {
  it('list with params', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list({ unit_id: 1, status: 'confirmed' })
    expect(apiClient.get).toHaveBeenCalledWith('/reservations', { params: { unit_id: 1, status: 'confirmed' } })
  })
  it('get', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1 } })
    await api.get(1)
    expect(apiClient.get).toHaveBeenCalledWith('/reservations/1')
  })
  it('create', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await api.create({ unit_id: 1 })
    expect(apiClient.post).toHaveBeenCalledWith('/reservations', { reservation: { unit_id: 1 } })
  })
  it('update', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await api.update(1, { notes: 'x' })
    expect(apiClient.patch).toHaveBeenCalledWith('/reservations/1', { reservation: { notes: 'x' } })
  })
  it('destroy', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/reservations/1')
  })
  it('checkIn', async () => {
    apiClient.patch.mockResolvedValue({ data: { status: 'checked_in' } })
    await api.checkIn(1)
    expect(apiClient.patch).toHaveBeenCalledWith('/reservations/1/check_in')
  })
  it('checkOut', async () => {
    apiClient.patch.mockResolvedValue({ data: { status: 'checked_out' } })
    await api.checkOut(1)
    expect(apiClient.patch).toHaveBeenCalledWith('/reservations/1/check_out')
  })
  it('cancel', async () => {
    apiClient.patch.mockResolvedValue({ data: { status: 'cancelled' } })
    await api.cancel(1)
    expect(apiClient.patch).toHaveBeenCalledWith('/reservations/1/cancel')
  })
})
