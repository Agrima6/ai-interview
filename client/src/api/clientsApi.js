import { apiGet, apiGetList } from "./client"

export const listClients = (params) => apiGetList("/api/v1/clients", params)
export const getClient = (id) => apiGet(`/api/v1/clients/${id}`)
