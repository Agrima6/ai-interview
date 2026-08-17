import * as onboardingService from "../services/onboarding.service.js"
import { ok, okList } from "../utils/response.js"

export const list = async (req, res, next) => {
    try {
        const { type, status, cursor, limit } = req.query
        const { items, hasNext, nextCursor } = await onboardingService.listForReview({ type, status, cursor, limit: Number(limit) || 25 })
        okList(res, items, { cursor: nextCursor, hasNext })
    } catch (error) { next(error) }
}

export const getById = async (req, res, next) => {
    try { ok(res, await onboardingService.getDetailForReview(req.params.id, { requestId: req.requestId, correlationId: req.correlationId })) }
    catch (error) { next(error) }
}

export const approve = async (req, res, next) => {
    try { ok(res, await onboardingService.approve(req.params.id, req.user.sub, { requestId: req.requestId, correlationId: req.correlationId })) }
    catch (error) { next(error) }
}

export const reject = async (req, res, next) => {
    try { ok(res, await onboardingService.reject(req.params.id, req.body?.reason)) }
    catch (error) { next(error) }
}

export const requestChanges = async (req, res, next) => {
    try { ok(res, await onboardingService.requestChanges(req.params.id, req.user.sub, req.body?.items)) }
    catch (error) { next(error) }
}
