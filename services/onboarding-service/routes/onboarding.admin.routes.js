import { Router } from "express"
import * as onboardingAdminController from "../controllers/onboarding.admin.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

router.get("/onboardings", authenticate, requirePermission("ONBOARDING_READ"), onboardingAdminController.list)
router.get("/onboardings/:id", authenticate, requirePermission("ONBOARDING_READ"), onboardingAdminController.getById)
router.post("/onboardings/:id/approve", authenticate, requirePermission("ONBOARDING_APPROVE"), onboardingAdminController.approve)
router.post("/onboardings/:id/reject", authenticate, requirePermission("ONBOARDING_REJECT"), onboardingAdminController.reject)
router.post("/onboardings/:id/request-changes", authenticate, requirePermission("ONBOARDING_REVIEW"), onboardingAdminController.requestChanges)

export default router
