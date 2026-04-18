// FT-036 P2: Property schema. Same fields для create + update.
import { z } from 'zod'
import { validate } from './auth'

export const PROPERTY_TYPES = ['apartment', 'hotel', 'house', 'hostel']

export const propertySchema = z.object({
  name: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  address: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  property_type: z
    .enum(PROPERTY_TYPES, { required_error: 'common.validation.required' }),
  description: z.string().max(5000, 'common.validation.maxLength5000').optional().or(z.literal('')),
  branch_id: z.number().int().nullable().optional(),
})

export { validate }
