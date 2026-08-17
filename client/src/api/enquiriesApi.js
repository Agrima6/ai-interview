import { apiGet, apiGetList, apiPatch, apiPost } from "./client"

export const submitPlatformEnquiry = (payload) => apiPost("/api/v1/enquiries", payload)
export const listEnquiries = (params) => apiGetList("/api/v1/enquiries", params)
export const getEnquiry = (id) => apiGet(`/api/v1/enquiries/${id}`)
export const updateEnquiry = (id, patch) => apiPatch(`/api/v1/enquiries/${id}`, patch)
export const callEnquiry = (id) => apiPost(`/api/v1/enquiries/${id}/call`)
