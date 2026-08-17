import { apiGet, apiPost } from "./client"

export const getRegistrationTypes = () => apiGet("/api/v1/registration-types")
export const getCaptcha = () => apiGet("/api/v1/captcha")
export const submitRegistration = (payload) => apiPost("/api/v1/registrations", payload)
