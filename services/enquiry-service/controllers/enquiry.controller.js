import * as enquiryService from "../services/enquiry.service.js"
import { ok, okList } from "../utils/response.js"

export const submit = async (req, res, next) => {
    try { ok(res, await enquiryService.submit(req.body)) } catch (error) { next(error) }
}

export const list = async (req, res, next) => {
    try {
        const { status, search, cursor, limit } = req.query
        const { items, hasNext, nextCursor } = await enquiryService.list({ status, search, cursor, limit: Number(limit) || 25 })
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
    try { ok(res, await enquiryService.logCall(req.params.id)) } catch (error) { next(error) }
}
