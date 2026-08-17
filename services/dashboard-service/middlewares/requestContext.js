import crypto from "crypto"

// Stamps every request with request/correlation IDs, and turns any thrown
// ApiError (or unexpected error) into the standard error envelope.
export const requestContext = (req, res, next) => {
    req.requestId = req.headers["x-request-id"] || crypto.randomUUID()
    req.correlationId = req.headers["x-correlation-id"] || req.requestId
    res.setHeader("X-Request-ID", req.requestId)
    next()
}

export const errorHandler = (err, req, res, next) => {
    const status = err.status || 500
    const code = err.code || "INTERNAL_ERROR"
    if (status >= 500) console.error(`[${process.env.SERVICE_NAME}] ${req.method} ${req.path}`, err)
    res.status(status).json({
        success: false,
        error: { code, message: err.message || "Something went wrong." },
        meta: { requestId: req.requestId },
    })
}

export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` },
        meta: { requestId: req.requestId },
    })
}
