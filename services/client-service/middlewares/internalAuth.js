import { ApiError } from "../utils/response.js"

// Who is allowed to call ME, and what key must they present.
// { "registration-service": "reg-service-secret", ... }
const incomingServiceKeys = JSON.parse(process.env.INCOMING_SERVICE_KEYS || "{}")

// What each caller is allowed to DO on me, once authenticated.
// { "registration-service": ["FORM_READ"], ... }
const servicePermissions = JSON.parse(process.env.SERVICE_PERMISSIONS || "{}")

export const authenticateService = (req, res, next) => {
    const serviceName = req.headers["x-service-name"]
    const apiKey = req.headers["x-service-api-key"]
    if (!serviceName || !apiKey) {
        return next(new ApiError(401, "SERVICE_UNAUTHENTICATED", "Missing service credentials."))
    }
    const expectedKey = incomingServiceKeys[serviceName]
    if (!expectedKey || expectedKey !== apiKey) {
        return next(new ApiError(401, "SERVICE_UNAUTHENTICATED", "Invalid service credentials."))
    }
    req.callingService = serviceName
    if (req.headers["x-request-id"]) req.requestId = req.headers["x-request-id"]
    if (req.headers["x-correlation-id"]) req.correlationId = req.headers["x-correlation-id"]
    next()
}

// A valid API key does not automatically grant access to every internal
// route - the caller must also be allowlisted for this specific permission.
export const requireServicePermission = (permission) => (req, res, next) => {
    const allowed = servicePermissions[req.callingService] || []
    if (!allowed.includes(permission)) {
        return next(new ApiError(403, "SERVICE_FORBIDDEN", `${req.callingService} is not permitted to perform ${permission}.`))
    }
    next()
}
