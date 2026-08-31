import { Router } from "express"
import * as clientController from "../controllers/client.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

// "My organization" - self-service for a signed-in client-portal admin,
// distinct from the staff-facing /clients/:id routes in client.routes.js.
// Reuses CLIENT_SELF_READ (already seeded on the CLIENT_ADMIN role, see
// auth-service/scripts/seed.js) and a new CLIENT_SELF_UPDATE for branding.
router.get("/organizations/me", authenticate, requirePermission("CLIENT_SELF_READ"), clientController.getMyOrganization)
router.patch("/organizations/me/branding", authenticate, requirePermission("CLIENT_SELF_UPDATE"), clientController.updateMyOrganizationBranding)

export default router
