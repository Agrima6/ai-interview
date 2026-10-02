export const ok = (res, data, meta = {}) => {
    res.json({ success: true, data, meta: { requestId: res.req.requestId, ...meta } })
}

// `meta` also accepts total/page/pageSize for page-oriented list endpoints -
// left undefined (and stripped by JSON.stringify) for cursor-paginated ones.
export const okList = (res, data, { cursor = null, hasNext = false, ...rest } = {}) => {
    res.json({ success: true, data, meta: { requestId: res.req.requestId, cursor, hasNext, ...rest } })
}

export const fail = (res, status, code, message) => {
    res.status(status).json({
        success: false,
        error: { code, message },
        meta: { requestId: res.req.requestId },
    })
}

export class ApiError extends Error {
    constructor(status, code, message) {
        super(message)
        this.status = status
        this.code = code
    }
}
