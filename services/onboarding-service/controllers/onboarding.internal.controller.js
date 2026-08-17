import * as onboardingService from "../services/onboarding.service.js"
import { ok } from "../utils/response.js"

export const statistics = async (req, res, next) => {
    try { ok(res, await onboardingService.statistics()) } catch (error) { next(error) }
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
