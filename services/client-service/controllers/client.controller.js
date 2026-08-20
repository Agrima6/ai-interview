import * as clientService from "../services/client.service.js"
import { ok, okList } from "../utils/response.js"

// Number(limit) || 25 alone lets a negative limit (still truthy) through
// unchanged, and has no upper bound - clamp into a sane range instead.
const clampLimit = (raw) => {
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 25
    return Math.min(Math.trunc(n), 100)
}

export const list = async (req, res, next) => {
    try {
        const { search, type, registrationStatus, approvalStatus, cursor, limit } = req.query
        const { items, hasNext, nextCursor } = await clientService.list({
            search, type, status: approvalStatus || registrationStatus, cursor, limit: clampLimit(limit),
        })
        okList(res, items, { cursor: nextCursor, hasNext })
    } catch (error) { next(error) }
}

export const getById = async (req, res, next) => {
    try { ok(res, await clientService.getById(req.params.id)) } catch (error) { next(error) }
}

export const approve = async (req, res, next) => {
    try { ok(res, await clientService.setStatus(req.params.id, "ACTIVE")) } catch (error) { next(error) }
}

export const reject = async (req, res, next) => {
    try { ok(res, await clientService.setStatus(req.params.id, "REJECTED")) } catch (error) { next(error) }
}

export const upsertInternal = async (req, res, next) => {
    try { ok(res, await clientService.upsertFromOnboarding(req.body)) } catch (error) { next(error) }
}

export const statisticsInternal = async (req, res, next) => {
    try { ok(res, await clientService.statistics()) } catch (error) { next(error) }
}
