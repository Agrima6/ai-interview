import { apiGetList } from './client'

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

/** Drives that organizations have deleted: platform administrators only (the server checks). */
export const listDeletedDrives = (params) => apiGetList('/api/v1/admin/deleted-drives', clean(params))
