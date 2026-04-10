import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'

vi.spyOn(axios, 'get').mockResolvedValue({ data: { units: [] } })
vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 1 } })

import * as api from '../../api/publicBooking'

describe('api/publicBooking', () => {
  it('getAvailability', async () => {
    await api.getAvailability('demo', '2026-05-01', '2026-05-05')
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/public/properties/demo/availability'),
      { params: { from: '2026-05-01', to: '2026-05-05' } },
    )
  })

  it('createBooking', async () => {
    await api.createBooking('demo', { unit_id: 1, check_in: '2026-05-01' })
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/public/properties/demo/bookings'),
      { unit_id: 1, check_in: '2026-05-01' },
    )
  })
})
