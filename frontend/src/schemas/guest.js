// FT-036 P2: Guest schema. Reused by GuestFormView + GuestQuickCreateDialog.
import { z } from 'zod'
import { validate } from './auth'

export const guestSchema = z.object({
  first_name: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  last_name: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  email: z
    .string()
    .email('common.validation.invalidEmail')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

export { validate }
