import rateLimit from "express-rate-limit"

const tooManyRequests = (req, res) => {
    res.status(429).json({
        success: false,
        error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." },
        meta: { requestId: req.requestId },
    })
}

// The onboarding token IS the credential (see resolveOwnedSession) - this
// route is effectively an authentication attempt, so it gets a tight,
// login-like limit to make brute-forcing tokens impractical.
export const tokenLookupRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
})
