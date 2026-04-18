import { describe, it, expect } from 'vitest'
import { guestSchema } from '../../schemas/guest'
import { propertySchema } from '../../schemas/property'
import { unitSchema } from '../../schemas/unit'
import { validate } from '../../schemas/auth'

describe('schemas/guest', () => {
  it('valid guest', () => {
    const r = validate(guestSchema, { first_name: 'A', last_name: 'B' })
    expect(r.valid).toBe(true)
  })

  it('empty first_name → error', () => {
    const r = validate(guestSchema, { first_name: '', last_name: 'B' })
    expect(r.valid).toBe(false)
    expect(r.errors.first_name).toBe('common.validation.required')
  })

  it('optional email empty ok', () => {
    const r = validate(guestSchema, { first_name: 'A', last_name: 'B', email: '' })
    expect(r.valid).toBe(true)
  })

  it('optional email invalid → error', () => {
    const r = validate(guestSchema, { first_name: 'A', last_name: 'B', email: 'bad' })
    expect(r.valid).toBe(false)
    expect(r.errors.email).toBe('common.validation.invalidEmail')
  })
})

describe('schemas/property', () => {
  const base = {
    name: 'Villa A',
    address: '1 Main',
    property_type: 'hotel',
    description: '',
    branch_id: null,
  }

  it('valid', () => {
    expect(validate(propertySchema, base).valid).toBe(true)
  })

  it('missing name', () => {
    const r = validate(propertySchema, { ...base, name: '' })
    expect(r.errors.name).toBe('common.validation.required')
  })

  it('bad property_type', () => {
    const r = validate(propertySchema, { ...base, property_type: 'castle' })
    expect(r.valid).toBe(false)
  })

  it('description too long', () => {
    const r = validate(propertySchema, { ...base, description: 'x'.repeat(5001) })
    expect(r.errors.description).toBe('common.validation.maxLength5000')
  })
})

describe('schemas/unit', () => {
  const base = {
    name: 'Room 1',
    unit_type: 'room',
    capacity: 2,
    status: 'available',
    base_price_cents: 500000,
  }

  it('valid', () => {
    expect(validate(unitSchema, base).valid).toBe(true)
  })

  it('capacity out of range', () => {
    const r = validate(unitSchema, { ...base, capacity: 0 })
    expect(r.errors.capacity).toBe('common.validation.capacityRange')
    const r2 = validate(unitSchema, { ...base, capacity: 101 })
    expect(r2.errors.capacity).toBe('common.validation.capacityRange')
  })

  it('bad unit_type', () => {
    const r = validate(unitSchema, { ...base, unit_type: 'palace' })
    expect(r.valid).toBe(false)
  })

  it('missing status', () => {
    const r = validate(unitSchema, { ...base, status: undefined })
    expect(r.valid).toBe(false)
  })

  it('base_price_cents optional', () => {
    const { base_price_cents, ...rest } = base
    void base_price_cents
    expect(validate(unitSchema, rest).valid).toBe(true)
  })
})
