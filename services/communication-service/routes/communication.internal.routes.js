import { Router } from "express"
import * as communicationController from "../controllers/communication.internal.controller.js"
import { authenticateService, requireServicePermission } from "../middlewares/internalAuth.js"

const router = Router()

router.post(
    "/internal/v1/communications",
    authenticateService,
    requireServicePermission("COMMUNICATION_CREATE"),
    communicationController.send
)
router.get(
    "/internal/v1/templates/:channel/:eventType",
    authenticateService,
    requireServicePermission("TEMPLATE_READ"),
    communicationController.getTemplate
)

export default router
