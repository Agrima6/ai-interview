import { apiGet } from "./client"

export const getRegistrationForm = (type) => apiGet(`/api/v1/forms/registration/${type}`)
