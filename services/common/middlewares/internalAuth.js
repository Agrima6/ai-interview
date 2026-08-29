import crypto from "crypto"
import { ApiError } from "../utils/response.js"

const safeEqual = (a, b) => {
    const ah = crypto.createHash("sha256").update(String(a)).digest()
    const bh = crypto.createHash("sha256").update(String(b)).digest()
    return crypto.timingSafeEqual(ah, bh)
}

export const authenticateService = (req, res, next) => {
    const incomingServiceKeys = JSON.parse(process.env.INCOMING_SERVICE_KEYS || "{}")
    const serviceName = req.headers["x-service-name"]
    const apiKey = req.headers["x-service-api-key"]
    if (!serviceName || !apiKey) {
        return next(new ApiError(401, "SERVICE_UNAUTHENTICATED", "Missing service credentials."))
    }
    const expectedKey = incomingServiceKeys[serviceName]
    if (!expectedKey || !safeEqual(expectedKey, apiKey)) {
        return next(new ApiError(401, "SERVICE_UNAUTHENTICATED", "Invalid service credentials."))
    }
    req.callingService = serviceName
    if (req.headers["x-request-id"]) req.requestId = req.headers["x-request-id"]
    if (req.headers["x-correlation-id"]) req.correlationId = req.headers["x-correlation-id"]
    next()
}

export const requireServicePermission = (permission) => (req, res, next) => {
    const servicePermissions = JSON.parse(process.env.SERVICE_PERMISSIONS || "{}")
    const allowed = servicePermissions[req.callingService] || []
    if (!allowed.includes(permission)) {
        return next(new ApiError(403, "SERVICE_FORBIDDEN", `${req.callingService} is not permitted to perform ${permission}.`))
    }
    next()
}
