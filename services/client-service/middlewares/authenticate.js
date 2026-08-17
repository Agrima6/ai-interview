import { verifyAccessToken } from "../utils/tokens.js"
import { ApiError } from "../utils/response.js"

// Verifies the end-user's access token (sent by the gateway, forwarded from
// the browser's Authorization header) - this is the public-user auth path,
// distinct from authenticateService which is for service-to-service calls.
export const authenticate = (req, res, next) => {
    const header = req.headers.authorization || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) return next(new ApiError(401, "UNAUTHENTICATED", "Missing access token."))
    try {
        req.user = verifyAccessToken(token)
        next()
    } catch (error) {
        next(new ApiError(401, "TOKEN_EXPIRED", "Access token invalid or expired."))
    }
}

export const requirePermission = (permission) => (req, res, next) => {
    if (!req.user?.permissions?.includes(permission)) {
        return next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action."))
    }
    next()
}
