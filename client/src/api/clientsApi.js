import { apiGet, apiGetList, apiPost, apiPatch } from "./client"

export const listClients = (params) => apiGetList("/api/v1/clients", params)
export const getClient = (id) => apiGet(`/api/v1/clients/${id}`)
export const suspendClient = (id) => apiPost(`/api/v1/clients/${id}/suspend`)
export const reactivateClient = (id) => apiPost(`/api/v1/clients/${id}/reactivate`)
// `expectedUpdatedAt` (the client's current updatedAt, as last read) enables
// optimistic-concurrency: the server rejects with 409 if someone else
// updated the client in between.
export const updateClient = (id, payload, expectedUpdatedAt) =>
    apiPatch(`/api/v1/clients/${id}`, { ...payload, expectedUpdatedAt })
export const getClientAuditHistory = (id) => apiGet(`/api/v1/clients/${id}/audit`)
