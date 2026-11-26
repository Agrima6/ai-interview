import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from './client'

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

// The platform owner writes announcements (the server checks the permission).
export const listAnnouncements = (params) => apiGetList('/api/v1/admin/announcements', clean(params))
export const createAnnouncement = (body) => apiPost('/api/v1/admin/announcements', body)
export const updateAnnouncement = (id, body) => apiPatch(`/api/v1/admin/announcements/${id}`, body)
export const stopAnnouncement = (id) => apiPost(`/api/v1/admin/announcements/${id}/stop`)
export const deleteAnnouncement = (id) => apiDelete(`/api/v1/admin/announcements/${id}`)

// What is live right now for the signed-in organization.
export const listLiveAnnouncements = () => apiGet('/api/v1/organization/announcements')
