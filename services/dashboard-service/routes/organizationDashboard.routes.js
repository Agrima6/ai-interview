import { Router } from "express"
import * as orgDashboardController from "../controllers/organizationDashboard.controller.js"
import { authenticate } from "../middlewares/authenticate.js"

const router = Router()

// No requirePermission gate beyond authentication - unlike the
// platform-admin dashboard (DASHBOARD_READ/etc, gating one shared view of
// every organization), this is a client-portal user's OWN organization's
// data, scoped server-side by req.user.tenantId inside the controller.
// Any authenticated organization account can see its own dashboard.
router.get("/organizations/me/dashboard/summary", authenticate, orgDashboardController.getSummary)
router.get("/organizations/me/dashboard/trends", authenticate, orgDashboardController.getTrends)
router.get("/organizations/me/dashboard/attention", authenticate, orgDashboardController.getAttention)
router.get("/organizations/me/dashboard/activity", authenticate, orgDashboardController.getActivity)

export default router
