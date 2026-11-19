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
    // Bad input that reached the database layer is the caller's mistake (400), not a server fault, and the
    // database's own wording (field paths, schema names) is never shown to the caller.
    if (err?.name === "ValidationError" && err.errors) {
        const fields = Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.kind === "required" ? "This is required." : "This value is not valid."]))
        err = Object.assign(new Error("Some details are missing or not valid."), { status: 400, code: "VALIDATION_ERROR", fields })
    } else if (err?.name === "CastError") {
        err = Object.assign(new Error("That value is not valid."), { status: 400, code: "VALIDATION_ERROR" })
    }
    const status = err.status || 500
    const code = err.code || "INTERNAL_ERROR"
    if (status >= 500) console.error(`[${process.env.SERVICE_NAME}] ${req.method} ${req.path}`, err)
    // An unexpected failure says nothing about its internals; deliberate errors (ApiError and friends carry a status) keep their message.
    const message = err.status ? err.message : "Something went wrong. Please try again."
    res.status(status).json({
        success: false,
        error: { code, message: message || "Something went wrong.", ...(err.fields ? { fields: err.fields } : {}) },
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
