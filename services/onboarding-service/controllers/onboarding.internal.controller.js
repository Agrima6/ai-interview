import * as onboardingService from "../services/onboarding.service.js"
import { ok } from "../utils/response.js"

const REGISTRATION_TYPES = new Set(["ORGANIZATION", "COLLEGE", "CANDIDATE"])

// Shared by statistics + trend: `type` narrows to one registration type,
// `from`/`to` (ISO date strings) narrow the createdAt window - both are
// optional and combine with each other.
const parseTypeDateFilters = (query) => {
    const filters = {}
    if (REGISTRATION_TYPES.has(query.type)) filters.type = query.type
    if (query.from) {
        const from = new Date(query.from)
        if (!Number.isNaN(from.getTime())) filters.from = from
    }
    if (query.to) {
        const to = new Date(query.to)
        if (!Number.isNaN(to.getTime())) filters.to = to
    }
    return filters
}

export const statistics = async (req, res, next) => {
    try { ok(res, await onboardingService.statistics(parseTypeDateFilters(req.query))) } catch (error) { next(error) }
}

export const trend = async (req, res, next) => {
    try {
        const { type, from, to } = parseTypeDateFilters(req.query)
        // Explicit from/to wins over the days-based window (kept for
        // backward compatibility with callers that only pass ?days=).
        let since = from
        if (!since) {
            const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90)
            since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
        ok(res, await onboardingService.trend(since, { type, until: to }))
    } catch (error) { next(error) }
}

export const activity = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50)
        ok(res, await onboardingService.activityPage({ cursor: req.query.cursor, limit }))
    } catch (error) { next(error) }
}

// POST /internal/v1/onboarding-invitations - called by registration-service
// right after a registration record is created.
export const createInvitation = async (req, res, next) => {
    try {
        const result = await onboardingService.createInvitationForRegistration(req.body, {
            requestId: req.requestId,
            correlationId: req.correlationId,
        })
        ok(res, result)
    } catch (error) { next(error) }
}
