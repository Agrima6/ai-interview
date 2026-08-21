import { Router } from "express"
import * as enquiryService from "../services/enquiry.service.js"
import { ok } from "../utils/response.js"
import { authenticateService, requireServicePermission } from "../middlewares/internalAuth.js"

const router = Router()

router.get(
    "/internal/v1/enquiries/statistics",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    async (req, res, next) => {
        try { ok(res, await enquiryService.statistics()) } catch (error) { next(error) }
    }
)
router.get(
    "/internal/v1/enquiries/statistics/trend",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    async (req, res, next) => {
        try {
            const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90)
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            ok(res, await enquiryService.trend(since))
        } catch (error) { next(error) }
    }
)

export default router
