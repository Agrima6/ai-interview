import { apiPost } from "./client"

export const login = (email, password) => apiPost("/api/v1/auth/login", { email, password })
export const logout = () => apiPost("/api/v1/auth/logout")
export const refresh = () => apiPost("/api/v1/auth/refresh")
export const googleLogin = (idToken) => apiPost("/api/v1/auth/google", { idToken })
export const changePassword = (currentPassword, newPassword) =>
    apiPost("/api/v1/auth/change-password", { currentPassword, newPassword })
