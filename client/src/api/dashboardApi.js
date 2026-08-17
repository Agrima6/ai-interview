import { apiGet } from "./client"

export const getDashboardSummary = () => apiGet("/api/v1/dashboard/summary")
export const getDashboardActivity = () => apiGet("/api/v1/dashboard/activity")
