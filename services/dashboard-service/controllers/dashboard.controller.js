import * as dashboardService from "../services/dashboard.service.js"
import { ok, okList } from "../utils/response.js"

export const getSummary = async (req, res, next) => {
    try { ok(res, await dashboardService.getSummary({ requestId: req.requestId, correlationId: req.correlationId })) }
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
        ok(res, await dashboardService.getTrends(range, { requestId: req.requestId, correlationId: req.correlationId }))
    } catch (error) { next(error) }
}
