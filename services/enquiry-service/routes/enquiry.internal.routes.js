import { Router } from "express"
import * as enquiryService from "../services/enquiry.service.js"
import { ok } from "../utils/response.js"
import { authenticateService, requireServicePermission } from "../middlewares/internalAuth.js"

const router = Router()

const ENQUIRY_TYPES = new Set(["ORGANIZATION", "COLLEGE", "CANDIDATE", "OTHER"])

const parseTypeDateFilters = (query) => {
    const filters = {}
    if (ENQUIRY_TYPES.has(query.type)) filters.type = query.type
    if (query.from) {
        const from = new Date(query.from)
        if (!Number.isNaN(from.getTime())) filters.from = from
    }
    if (query.to) {
        const to = new Date(query.to)
        if (!Number.isNaN(to.getTime())) filters.to = to
    }
    return filters
}

router.get(
    "/internal/v1/enquiries/statistics",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    async (req, res, next) => {
        try { ok(res, await enquiryService.statistics(parseTypeDateFilters(req.query))) } catch (error) { next(error) }
    }
)
router.get(
    "/internal/v1/enquiries/statistics/trend",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    async (req, res, next) => {
        try {
            const { type, from, to } = parseTypeDateFilters(req.query)
            let since = from
            if (!since) {
                const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90)
                since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
            ok(res, await enquiryService.trend(since, { type, until: to }))
        } catch (error) { next(error) }
    }
)

export default router
