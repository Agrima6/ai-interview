import { apiGet, apiGetList } from './client'
import { downloadCsv } from './billingApi'

// An organization's own billing, read-only. The server always answers for the signed-in organization.
const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const getOwnBilling = (params) => apiGet('/api/v1/organization/billing', clean(params))
export const listOwnBillingLines = (params) => apiGetList('/api/v1/organization/billing/lines', clean(params))
export const downloadOwnBillingCsv = (params) => downloadCsv('/api/v1/organization/billing/export', params)
