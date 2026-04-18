// FT-036 P4: Owner schema.
// commission_rate — basis points (0..10000 = 0..100%). Form uses
// commission_pct (percent float) and converts *100 on submit.
import { z } from 'zod'
import { validate } from './auth'

export const ownerSchema = z.object({
  name: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  email: z
    .string()
    .email('common.validation.invalidEmail')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  commission_rate: z.number().int().min(0).max(10000).optional(),
  notes: z.string().optional().or(z.literal('')),
})

export { validate }
