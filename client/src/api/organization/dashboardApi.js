import { apiGet, apiGetList } from "../client"

// Four independent calls, not bundled into one Promise.all - a failure in
// one (e.g. attention) must not take down the whole dashboard (KPIs and
// pipeline should keep rendering). See useOrganizationDashboard.js, which
// runs these as four independent TanStack queries for exactly that reason.
export const getDashboardSummary = () => apiGet("/api/v1/organizations/me/dashboard/summary")
export const getDashboardTrends = (range) => apiGet("/api/v1/organizations/me/dashboard/trends", { range })
export const getDashboardAttention = () => apiGet("/api/v1/organizations/me/dashboard/attention")
export const getDashboardActivity = () => apiGetList("/api/v1/organizations/me/dashboard/activity")
