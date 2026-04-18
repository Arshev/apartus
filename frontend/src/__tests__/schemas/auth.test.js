import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema, validate } from '../../schemas/auth'

describe('schemas/auth', () => {
  describe('loginSchema', () => {
    it('accepts valid email + password', () => {
      const { valid, errors } = validate(loginSchema, {
        email: 'user@example.com',
        password: 'secret',
      })
      expect(valid).toBe(true)
      expect(errors).toEqual({})
    })

    it('rejects empty email', () => {
      const { valid, errors } = validate(loginSchema, { email: '', password: 'x' })
      expect(valid).toBe(false)
      expect(errors.email).toBe('common.validation.required')
    })

    it('rejects bad email format', () => {
      const { valid, errors } = validate(loginSchema, {
        email: 'notanemail',
        password: 'x',
      })
      expect(valid).toBe(false)
      expect(errors.email).toBe('common.validation.invalidEmail')
    })

    it('rejects empty password', () => {
      const { valid, errors } = validate(loginSchema, {
        email: 'user@example.com',
        password: '',
      })
      expect(valid).toBe(false)
      expect(errors.password).toBe('common.validation.required')
    })
  })

  describe('registerSchema', () => {
    const valid = {
      organization_name: 'Acme',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      password: 'longpass1',
      password_confirmation: 'longpass1',
    }

    it('accepts fully valid data', () => {
      const r = validate(registerSchema, valid)
      expect(r.valid).toBe(true)
    })

    it('rejects short password', () => {
      const r = validate(registerSchema, { ...valid, password: 'short', password_confirmation: 'short' })
      expect(r.valid).toBe(false)
      expect(r.errors.password).toBe('common.validation.minLength8')
    })

    it('rejects password mismatch', () => {
      const r = validate(registerSchema, { ...valid, password_confirmation: 'different!' })
      expect(r.valid).toBe(false)
      expect(r.errors.password_confirmation).toBe('common.validation.passwordsMismatch')
    })

    it('rejects missing organization_name', () => {
      const r = validate(registerSchema, { ...valid, organization_name: '' })
      expect(r.valid).toBe(false)
      expect(r.errors.organization_name).toBe('common.validation.required')
    })

    it('rejects bad email', () => {
      const r = validate(registerSchema, { ...valid, email: 'not-an-email' })
      expect(r.valid).toBe(false)
      expect(r.errors.email).toBe('common.validation.invalidEmail')
    })
  })

  describe('validate() helper', () => {
    it('returns first error per field', () => {
      // `email: ''` triggers both min(1) и email() — ensure single message
      const { errors } = validate(loginSchema, { email: '', password: '' })
      expect(typeof errors.email).toBe('string')
    })
  })
})
