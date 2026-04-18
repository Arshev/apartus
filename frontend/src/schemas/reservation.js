// FT-036 P6: Reservation form schema.
import { z } from 'zod'
import { validate } from './auth'

export const reservationSchema = z.object({
  unit_id: z
    .number({
      required_error: 'common.validation.required',
      invalid_type_error: 'common.validation.required',
    })
    .int(),
  guest_id: z.number().int().nullable().optional(),
  check_in: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  check_out: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  guests_count: z
    .number({
      required_error: 'common.validation.required',
      invalid_type_error: 'common.validation.required',
    })
    .int()
    .min(1, 'common.validation.minOne'),
  total_price_cents: z.number().int().min(0).optional(),
  notes: z.string().optional().or(z.literal('')),
})

export { validate }
