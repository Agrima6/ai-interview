import * as dashboardService from "../services/dashboard.service.js"
import { ok, okList } from "../utils/response.js"

const REGISTRATION_TYPES = new Set(["ORGANIZATION", "COLLEGE", "CANDIDATE"])

// The one filter context every dashboard endpoint (summary/trends) resolves
// through - keeps KPI cards, the funnel and the charts from ever disagreeing
// about which registrations they're describing.
const parseDashboardFilters = (query) => {
    const filters = {}
    if (REGISTRATION_TYPES.has(query.type)) filters.registrationType = query.type
    if (query.from) {
        const from = new Date(query.from)
        if (!Number.isNaN(from.getTime())) filters.from = from.toISOString()
    }
    if (query.to) {
        const to = new Date(query.to)
        if (!Number.isNaN(to.getTime())) filters.to = to.toISOString()
    }
    return filters
}

export const getSummary = async (req, res, next) => {
    try {
        const filters = parseDashboardFilters(req.query)
        ok(res, await dashboardService.getSummary(filters, { requestId: req.requestId, correlationId: req.correlationId }))
    }
    catch (error) { next(error) }
}

// Gated separately on DASHBOARD_ACTIVITY_READ - a user with only
// DASHBOARD_READ must never trigger this call, enforced both by the
// frontend (it won't render the widget) and here (permission middleware).
export const getActivity = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50)
        const { items, hasNext, nextCursor } = await dashboardService.getActivity(
            { cursor: req.query.cursor, limit },
            { requestId: req.requestId, correlationId: req.correlationId }
        )
        okList(res, items, { cursor: nextCursor, hasNext })
    } catch (error) { next(error) }
}

const VALID_RANGES = new Set(["7d", "30d", "90d"])

export const getTrends = async (req, res, next) => {
    try {
        const range = VALID_RANGES.has(req.query.range) ? req.query.range : "30d"
        const filters = parseDashboardFilters(req.query)
        ok(res, await dashboardService.getTrends(range, filters, { requestId: req.requestId, correlationId: req.correlationId }))
    } catch (error) { next(error) }
}
