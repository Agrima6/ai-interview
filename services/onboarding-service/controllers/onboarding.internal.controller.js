import * as onboardingService from "../services/onboarding.service.js"
import { ok } from "../utils/response.js"

export const statistics = async (req, res, next) => {
    try { ok(res, await onboardingService.statistics()) } catch (error) { next(error) }
}

export const trend = async (req, res, next) => {
    try {
        const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90)
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        ok(res, await onboardingService.trend(since))
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
