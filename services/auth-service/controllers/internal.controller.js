import * as authService from "../services/auth.service.js"
import { ok } from "../utils/response.js"

// POST /internal/v1/client-users - called by onboarding-service on approval
// of an ORGANIZATION/COLLEGE, to create that client's first login.
export const createClientUser = async (req, res, next) => {
    try {
        const { email, name, clientId } = req.body
        const result = await authService.createClientUser({ email, name, clientId })
        ok(res, result)
    } catch (error) { next(error) }
}

// POST /internal/v1/candidate-users - called by client-service right after
// a candidate submits their public interview application.
export const createCandidateUser = async (req, res, next) => {
    try {
        const { email, name, tenantId } = req.body
        const result = await authService.createCandidateUser({ email, name, tenantId })
        ok(res, result)
    } catch (error) { next(error) }
}
