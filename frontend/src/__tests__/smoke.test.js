import { describe, it, expect } from 'vitest'

// Placeholder smoke test — proves the Vitest pipeline is wired up and
// coverage-summary.json is produced for the CI badge script. Real component
// tests are added per-feature during HW-1.
describe('smoke', () => {
  it('arithmetic still works', () => {
    expect(1 + 1).toBe(2)
  })
})
