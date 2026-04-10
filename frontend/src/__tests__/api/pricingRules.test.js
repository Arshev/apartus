import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import apiClient from '../../api/client'
import * as api from '../../api/pricingRules'

describe('api/pricingRules', () => {
  it('list', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    await api.list()
    expect(apiClient.get).toHaveBeenCalledWith('/pricing_rules')
  })
  it('create', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } })
    await api.create({ unit_id: 1, rule_type: 'length_discount' })
    expect(apiClient.post).toHaveBeenCalledWith('/pricing_rules', {
      pricing_rule: { unit_id: 1, rule_type: 'length_discount' },
    })
  })
  it('update', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1 } })
    await api.update(1, { active: false })
    expect(apiClient.patch).toHaveBeenCalledWith('/pricing_rules/1', { pricing_rule: { active: false } })
  })
  it('destroy', async () => {
    apiClient.delete.mockResolvedValue({ data: {} })
    await api.destroy(1)
    expect(apiClient.delete).toHaveBeenCalledWith('/pricing_rules/1')
  })
})
