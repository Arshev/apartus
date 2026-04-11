import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '../../api/client'
import { downloadFinancialReport, downloadOwnerStatement } from '../../api/pdfExport'

// Mock URL.createObjectURL and createElement
globalThis.URL.createObjectURL = vi.fn(() => 'blob:test')
globalThis.URL.revokeObjectURL = vi.fn()

describe('api/pdfExport', () => {
  it('downloadFinancialReport calls GET /reports/financial/pdf with blob', async () => {
    apiClient.get.mockResolvedValue({ data: new Blob(['pdf']) })
    await downloadFinancialReport({ from: '2026-04-01' })
    expect(apiClient.get).toHaveBeenCalledWith('/reports/financial/pdf', {
      params: { from: '2026-04-01' },
      responseType: 'blob',
    })
  })

  it('downloadOwnerStatement calls GET /owners/:id/statement with format=pdf', async () => {
    apiClient.get.mockResolvedValue({ data: new Blob(['pdf']) })
    await downloadOwnerStatement(5)
    expect(apiClient.get).toHaveBeenCalledWith('/owners/5/statement', {
      params: { format: 'pdf' },
      responseType: 'blob',
    })
  })
})
