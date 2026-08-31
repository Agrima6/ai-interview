import * as orgDashboardService from "../services/organizationDashboard.service.js"
import { ok, okList, ApiError } from "../utils/response.js"

const VALID_RANGES = new Set(["7d", "30d", "90d"])

// Every handler requires req.user.tenantId - only a client-portal
// (CLIENT_ADMIN) user has one; a platform-admin token has tenantId: null
// and gets a clean 403 rather than silently resolving to "no organization".
const requireTenant = (req) => {
    if (!req.user?.tenantId) throw new ApiError(403, "NOT_AN_ORGANIZATION_ACCOUNT", "This account is not linked to an organization.")
    return req.user.tenantId
}

export const getSummary = async (req, res, next) => {
    try { ok(res, await orgDashboardService.getSummary(requireTenant(req))) } catch (error) { next(error) }
}

export const getTrends = async (req, res, next) => {
    try {
        const range = VALID_RANGES.has(req.query.range) ? req.query.range : "30d"
        ok(res, await orgDashboardService.getTrends(requireTenant(req), range))
    } catch (error) { next(error) }
}

export const getAttention = async (req, res, next) => {
    try { ok(res, await orgDashboardService.getAttention(requireTenant(req))) } catch (error) { next(error) }
}

export const getActivity = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50)
        const { items, hasNext, nextCursor } = await orgDashboardService.getActivity(requireTenant(req), { cursor: req.query.cursor, limit })
        okList(res, items, { cursor: nextCursor, hasNext })
    } catch (error) { next(error) }
}
