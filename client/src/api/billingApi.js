import client, { apiGet, apiGetList, apiPut } from './client'

// Candidate-wise billing: platform administrators only (the server checks; the page hides it from everyone else).
const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const getBillingSummary = (params) => apiGet('/api/v1/admin/billing/summary', clean(params))
export const getBillingOrganization = (key, params) => apiGet(`/api/v1/admin/billing/organizations/${key}`, clean(params))
export const listBillingLines = (key, params) => apiGetList(`/api/v1/admin/billing/organizations/${key}/lines`, clean(params))
export const saveBillingRates = (key, body) => apiPut(`/api/v1/admin/billing/rates/${key}`, body)

/** Downloads a CSV (the whole summary, or one client's annexure). `path` is "export" or "organizations/<key>/export". */
export const downloadBillingCsv = async (path, params) => {
    let res
    try { res = await client.get(`/api/v1/admin/billing/${path}`, { params: clean(params), responseType: 'blob' }) } catch { throw new Error('Could not prepare the file. Please try again.') }
    const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || 'billing.csv'
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
