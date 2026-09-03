import { apiGet, apiGetList } from "./client"

// `filters` = { type, from, to } - the one filter context shared by every
// dashboard call, so KPI cards/trend chart/funnel/status distribution never
// disagree about which registrations they're describing.
export const getDashboardSummary = (filters = {}) => apiGet("/api/v1/dashboard/summary", filters)
// Cursor-based, not offset - pass the previous call's `cursor` back in to
// get the next page; omit it to start over from the most recent item.
export const getDashboardActivity = ({ cursor, limit } = {}) => apiGetList("/api/v1/dashboard/activity", { cursor, limit })
export const getDashboardTrends = (range, filters = {}) => apiGet("/api/v1/dashboard/trends", { range, ...filters })
