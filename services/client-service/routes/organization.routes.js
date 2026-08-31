import { Router } from "express"
import * as clientController from "../controllers/client.controller.js"
import * as portalController from "../controllers/organizationPortal.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

// "My organization" - self-service for a signed-in client-portal admin
router.get("/organizations/me", authenticate, requirePermission("CLIENT_SELF_READ"), clientController.getMyOrganization)
router.patch("/organizations/me/branding", authenticate, requirePermission("CLIENT_SELF_UPDATE"), clientController.updateMyOrganizationBranding)

// Team & Access Control
router.get("/organization/team", authenticate, portalController.listTeamMembers)
router.post("/organization/team/invite", authenticate, portalController.inviteTeamMember)
router.delete("/organization/team/:id", authenticate, portalController.removeTeamMember)

// Question Banks
router.get("/question-banks", authenticate, portalController.listQuestionBanks)
router.post("/question-banks", authenticate, portalController.createQuestionBank)

// Notification Templates
router.get("/organization/templates", authenticate, portalController.listTemplates)
router.put("/organization/templates/:id", authenticate, portalController.updateTemplate)

export default router
