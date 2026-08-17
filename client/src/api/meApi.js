import { apiGet } from "./client"

export const getMe = () => apiGet("/api/v1/me")
