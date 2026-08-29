import rateLimit from "express-rate-limit"

const tooManyRequests = (req, res) => {
    res.status(429).json({
        success: false,
        error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." },
        meta: { requestId: req.requestId },
    })
}

// Public, unauthenticated submission endpoint.
export const submitRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
})
