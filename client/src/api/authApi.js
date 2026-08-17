import { apiPost } from "./client"

export const login = (email, password) => apiPost("/api/v1/auth/login", { email, password })
export const logout = () => apiPost("/api/v1/auth/logout")
export const refresh = () => apiPost("/api/v1/auth/refresh")
