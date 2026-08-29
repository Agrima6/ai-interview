import rateLimit from "express-rate-limit"

// Keyed by IP (express-rate-limit's default) - fine for a single-region VPS
// without a shared store; if this ever runs multi-instance, swap in a Redis
// store instead of adding more per-instance limiters.
const tooManyRequests = (req, res) => {
    res.status(429).json({
        success: false,
        error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." },
        meta: { requestId: req.requestId },
    })
}

// Credential-stuffing/brute-force surface - the tightest limit in this service.
export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
})

// Refresh is called automatically by the frontend on every 401, so it needs
// a looser ceiling than login, but should still cap runaway retry loops or
// refresh-token brute-forcing.
export const refreshRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
})

// Public and unauthenticated - the abuse surface is spamming reset emails
// at an arbitrary address, or brute-forcing a reset token.
export const forgotPasswordRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
})

export const resetPasswordRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
})
