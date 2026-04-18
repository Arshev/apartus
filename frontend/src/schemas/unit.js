// FT-036 P2: Unit schema. Same fields для create + update.
// Note: base_price accepted as cents в payload (integer).
import { z } from 'zod'
import { validate } from './auth'

export const UNIT_TYPES = ['room', 'apartment', 'bed', 'studio']
export const UNIT_STATUSES = ['available', 'maintenance', 'blocked']

export const unitSchema = z.object({
  name: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  unit_type: z.enum(UNIT_TYPES, { required_error: 'common.validation.required' }),
  capacity: z
    .number({
      required_error: 'common.validation.required',
      invalid_type_error: 'common.validation.required',
    })
    .int()
    .min(1, 'common.validation.capacityRange')
    .max(100, 'common.validation.capacityRange'),
  status: z.enum(UNIT_STATUSES, { required_error: 'common.validation.required' }),
  base_price_cents: z.number().int().min(0).optional(),
})

export { validate }
