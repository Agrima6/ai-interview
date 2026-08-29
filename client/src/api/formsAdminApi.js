import { apiGet, apiGetList, apiPost } from "./client"

export const listForms = (params = {}) => apiGetList("/api/v1/forms", params)
export const getForm = (type, stage) => apiGet(`/api/v1/forms/${encodeURIComponent(type)}/${encodeURIComponent(stage)}`)
export const saveForm = (type, stage, payload) => apiPost(`/api/v1/forms/${encodeURIComponent(type)}/${encodeURIComponent(stage)}`, payload)
export const publishForm = (type, stage) => apiPost(`/api/v1/forms/${encodeURIComponent(type)}/${encodeURIComponent(stage)}/publish`, {})
