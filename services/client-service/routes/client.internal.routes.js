import { Router } from "express"
import * as clientController from "../controllers/client.controller.js"
import * as driveController from "../controllers/interviewDrive.controller.js"
import { authenticateService, requireServicePermission } from "../middlewares/internalAuth.js"

const router = Router()

router.post(
    "/internal/v1/clients",
    authenticateService,
    requireServicePermission("CLIENT_WRITE"),
    clientController.upsertInternal
)
router.get(
    "/internal/v1/clients/statistics",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    clientController.statisticsInternal
)
router.get(
    "/internal/v1/drives/tenant-report",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    driveController.getTenantReportInternal
)

export default router
