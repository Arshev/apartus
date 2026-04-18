// FT-036 P1: Zod schemas для auth forms.
//
// Error messages are i18n keys (not resolved translations) — calling code
// runs them через t() to get localized text. Keeps schemas pure functions
// and decouples validation logic from i18n runtime.

import { z } from 'zod'

// Login: email + password required, email RFC-ish.
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required')
    .email('common.validation.invalidEmail'),
  password: z
    .string({ required_error: 'common.validation.required' })
    .min(1, 'common.validation.required'),
})

// Register: same as login + name + org + password confirm (refine for match).
export const registerSchema = z
  .object({
    organization_name: z
      .string({ required_error: 'common.validation.required' })
      .min(1, 'common.validation.required'),
    first_name: z
      .string({ required_error: 'common.validation.required' })
      .min(1, 'common.validation.required'),
    last_name: z
      .string({ required_error: 'common.validation.required' })
      .min(1, 'common.validation.required'),
    email: z
      .string({ required_error: 'common.validation.required' })
      .min(1, 'common.validation.required')
      .email('common.validation.invalidEmail'),
    password: z
      .string({ required_error: 'common.validation.required' })
      .min(8, 'common.validation.minLength8'),
    password_confirmation: z.string({
      required_error: 'common.validation.required',
    }),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'common.validation.passwordsMismatch',
    path: ['password_confirmation'],
  })

/**
 * Run Zod schema validation and return field-level error map
 * keyed by path. Each error value is the i18n key; caller applies t().
 *
 * @param {z.ZodType} schema
 * @param {object} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) return { valid: true, errors: {} }
  const errors = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || '_'
    if (!errors[field]) errors[field] = issue.message
  }
  return { valid: false, errors }
}
