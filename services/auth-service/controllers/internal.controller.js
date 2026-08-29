import * as authService from "../services/auth.service.js"
import { ok } from "@workmateiq/common"

// POST /internal/v1/client-users - called by onboarding-service on approval
// of an ORGANIZATION/COLLEGE, to create that client's first login.
export const createClientUser = async (req, res, next) => {
    try {
        const { email, name, clientId } = req.body
        const result = await authService.createClientUser({ email, name, clientId })
        ok(res, result)
    } catch (error) { next(error) }
}
