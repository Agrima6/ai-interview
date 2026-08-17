import { Router } from "express"
import * as dashboardController from "../controllers/dashboard.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

router.get("/dashboard/summary", authenticate, requirePermission("DASHBOARD_READ"), dashboardController.getSummary)
router.get("/dashboard/activity", authenticate, requirePermission("DASHBOARD_ACTIVITY_READ"), dashboardController.getActivity)

export default router
