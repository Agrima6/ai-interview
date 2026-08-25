import { apiGet, apiGetList } from "./client"

export const getDashboardSummary = () => apiGet("/api/v1/dashboard/summary")
// Cursor-based, not offset - pass the previous call's `cursor` back in to
// get the next page; omit it to start over from the most recent item.
export const getDashboardActivity = ({ cursor, limit } = {}) => apiGetList("/api/v1/dashboard/activity", { cursor, limit })
export const getDashboardTrends = (range) => apiGet("/api/v1/dashboard/trends", { range })
