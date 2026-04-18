// FT-036 P4: Expense schema.
import { z } from 'zod'
import { validate } from './auth'

export const EXPENSE_CATEGORIES = ['maintenance', 'utilities', 'cleaning', 'supplies', 'other']

// Form uses amount_rub (units) — convert to amount_cents at submit.
// Schema validates amount_cents (cents, positive).
export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { required_error: 'common.validation.required' }),
  amount_cents: z
    .number({
      required_error: 'common.validation.required',
      invalid_type_error: 'common.validation.required',
    })
    .int()
    .min(0, 'common.validation.required'),
  expense_date: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
  description: z.string().optional().or(z.literal('')),
})

export { validate }
