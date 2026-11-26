import { Router } from "express"
import * as clientController from "../controllers/client.controller.js"
import * as portalController from "../controllers/organizationPortal.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { ok } from "../utils/response.js"
import { listAllDrives } from "../services/unifiedDrives.service.js"
import { aiCandidateOf } from "../services/adminResults.service.js"
import { listNotifications } from "../services/orgNotifications.service.js"
import * as billing from "../services/billing.service.js"

const router = Router()

// "My organization" - self-service for a signed-in client-portal admin
router.get("/organizations/me", authenticate, requirePermission("CLIENT_SELF_READ"), clientController.getMyOrganization)
router.patch("/organizations/me/branding", authenticate, requirePermission("CLIENT_SELF_UPDATE"), clientController.updateMyOrganizationBranding)

// What happened recently: candidates who finished a test or an AI interview
router.get("/organization/notifications", authenticate, requirePermission("CLIENT_SELF_READ"), async (req, res, next) => {
    try { ok(res, await listNotifications(req.user?.tenantId)) } catch (error) { next(error) }
})

// Every drive the organization runs (multi-round drives and classic AI Interview drives) in one list
router.get("/organization/all-drives", authenticate, requirePermission("CLIENT_SELF_READ"), async (req, res, next) => {
    try {
        const { items, total, page, pageSize, counts } = await listAllDrives(req.user?.tenantId, req.query)
        ok(res, items, { total, page, pageSize, counts })
    } catch (error) { next(error) }
})

// An organization's own billing (read-only): what it is charged for candidates who gave the interview. The organization is
// always the signed-in user's own; nothing in the request can name another one.
const wrapOwn = (fn) => async (req, res, next) => { try { await fn(req, res) } catch (error) { next(error) } }
const csv = (res, { filename, csv: body }) => { res.setHeader("Content-Type", "text/csv; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename="${filename}"`); res.setHeader("Cache-Control", "no-store"); res.send(body) }
router.get("/organization/billing", authenticate, requirePermission("CLIENT_SELF_READ"), wrapOwn(async (req, res) => ok(res, await billing.getOwnBilling(req.user?.tenantId, req.query))))
router.get("/organization/billing/lines", authenticate, requirePermission("CLIENT_SELF_READ"), wrapOwn(async (req, res) => {
    const { items, total, page, pageSize, summary } = await billing.listOwnLines(req.user?.tenantId, req.query)
    ok(res, items, { total, page, pageSize, summary })
}))
router.get("/organization/billing/ai-candidate", authenticate, requirePermission("CLIENT_SELF_READ"), wrapOwn(async (req, res) => ok(res, await aiCandidateOf(req.query.driveId, req.query.email, req.user?.tenantId))))
router.get("/organization/billing/export", authenticate, requirePermission("CLIENT_SELF_READ"), wrapOwn(async (req, res) => csv(res, await billing.exportOwnCsv(req.user?.tenantId, req.query))))

// Team & Access Control
router.get("/organization/team", authenticate, requirePermission("CLIENT_SELF_READ"), portalController.listTeamMembers)
router.post("/organization/team/invite", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.inviteTeamMember)
router.delete("/organization/team/:id", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.removeTeamMember)

// Question Banks
router.get("/question-banks", authenticate, requirePermission("CLIENT_SELF_READ"), portalController.listQuestionBanks)
router.post("/question-banks", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.createQuestionBank)
router.get("/question-banks/:id", authenticate, requirePermission("CLIENT_SELF_READ"), portalController.getQuestionBank)
router.patch("/question-banks/:id", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.updateQuestionBank)
router.delete("/question-banks/:id", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.deleteQuestionBank)

// Notification Templates
router.get("/organization/templates", authenticate, requirePermission("CLIENT_SELF_READ"), portalController.listTemplates)
router.post("/organization/templates/defaults", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.loadDefaultTemplates)
router.post("/organization/templates", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.createTemplate)
router.put("/organization/templates/:id", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.updateTemplate)
router.post("/organization/templates/:id/preview", authenticate, requirePermission("CLIENT_SELF_READ"), portalController.previewTemplate)
router.delete("/organization/templates/:id", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.deleteTemplate)

// SMTP Settings
router.get("/organization/smtp", authenticate, requirePermission("CLIENT_SELF_READ"), portalController.getSmtpSettings)
router.put("/organization/smtp", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.updateSmtpSettings)
router.post("/organization/smtp/test", authenticate, requirePermission("CLIENT_SELF_UPDATE"), portalController.testSmtpConnection)

export default router
