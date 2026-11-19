import { apiGetList } from './client'

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

/** Every drive the organization runs (multi-round drives and classic AI Interview drives), one page at a time. */
export const listAllDrives = (params) => apiGetList('/api/v1/organization/all-drives', clean(params))
