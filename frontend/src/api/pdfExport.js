import apiClient from './client'

export async function downloadFinancialReport(params = {}) {
  const response = await apiClient.get('/reports/financial/pdf', {
    params,
    responseType: 'blob',
  })
  downloadBlob(response.data, `financial_report.pdf`)
}

export async function downloadOwnerStatement(ownerId, params = {}) {
  const response = await apiClient.get(`/owners/${ownerId}/statement`, {
    params: { ...params, format: 'pdf' },
    responseType: 'blob',
  })
  downloadBlob(response.data, `owner_statement_${ownerId}.pdf`)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
