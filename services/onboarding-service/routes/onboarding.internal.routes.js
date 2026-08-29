import { Router } from "express"
import * as onboardingInternalController from "../controllers/onboarding.internal.controller.js"
import { authenticateService, requireServicePermission } from "../middlewares/internalAuth.js"

const router = Router()

router.post(
    "/internal/v1/onboarding-invitations",
    authenticateService,
    requireServicePermission("INVITATION_CREATE"),
    onboardingInternalController.createInvitation
)
router.get(
    "/internal/v1/statistics",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    onboardingInternalController.statistics
)
router.get(
    "/internal/v1/statistics/trend",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    onboardingInternalController.trend
)
router.get(
    "/internal/v1/activity",
    authenticateService,
    requireServicePermission("STATISTICS_READ"),
    onboardingInternalController.activity
)

export default router
