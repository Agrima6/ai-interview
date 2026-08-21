import * as enquiryService from "../services/enquiry.service.js"
import { ok, okList } from "../utils/response.js"

export const submit = async (req, res, next) => {
    try { ok(res, await enquiryService.submit(req.body)) } catch (error) { next(error) }
}

// Number(limit) || 25 alone lets a negative limit (still truthy) through
// unchanged, and has no upper bound - clamp into a sane range instead.
const clampLimit = (raw) => {
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 25
    return Math.min(Math.trunc(n), 100)
}

export const list = async (req, res, next) => {
    try {
        const { status, search, cursor, limit } = req.query
        const { items, hasNext, nextCursor } = await enquiryService.list({ status, search, cursor, limit: clampLimit(limit) })
        okList(res, items, { cursor: nextCursor, hasNext })
    } catch (error) { next(error) }
}

export const getById = async (req, res, next) => {
    try { ok(res, await enquiryService.getById(req.params.id)) } catch (error) { next(error) }
}

export const update = async (req, res, next) => {
    try { ok(res, await enquiryService.updateStatus(req.params.id, req.body.status, req.body.assignedTo)) } catch (error) { next(error) }
}

export const call = async (req, res, next) => {
    try {
        const { status, notes, durationSec, nextFollowUpAt } = req.body || {}
        ok(res, await enquiryService.logCall(req.params.id, { status, notes, durationSec, nextFollowUpAt }))
    } catch (error) { next(error) }
}
