import { apiGet, apiGetList, apiPost } from "./client"

export const listClients = (params) => apiGetList("/api/v1/clients", params)
export const getClient = (id) => apiGet(`/api/v1/clients/${id}`)
export const suspendClient = (id) => apiPost(`/api/v1/clients/${id}/suspend`)
export const reactivateClient = (id) => apiPost(`/api/v1/clients/${id}/reactivate`)
