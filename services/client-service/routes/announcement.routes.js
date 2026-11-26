import { Router } from "express"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { ok, okList } from "../utils/response.js"
import * as announcements from "../services/announcement.service.js"

const router = Router()
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res) } catch (error) { next(error) } }

// The platform owner writes them (SUPER_ADMIN carries SETTINGS_WRITE).
const adminOnly = [authenticate, requirePermission("SETTINGS_WRITE")]
router.get("/admin/announcements", ...adminOnly, wrap(async (req, res) => {
    const { items, total, page, pageSize } = await announcements.listAnnouncements(req.query)
    okList(res, items, { total, page, pageSize })
}))
router.post("/admin/announcements", ...adminOnly, wrap(async (req, res) => ok(res, await announcements.createAnnouncement(req.body || {}, req.user?.email || req.user?.sub))))
router.patch("/admin/announcements/:id", ...adminOnly, wrap(async (req, res) => ok(res, await announcements.updateAnnouncement(req.params.id, req.body || {}))))
router.post("/admin/announcements/:id/stop", ...adminOnly, wrap(async (req, res) => ok(res, await announcements.stopAnnouncement(req.params.id))))
router.delete("/admin/announcements/:id", ...adminOnly, wrap(async (req, res) => ok(res, await announcements.deleteAnnouncement(req.params.id))))

// Every organization reads what is live for it. Read-only, and it only ever names the signed-in organization.
router.get("/organization/announcements", authenticate, requirePermission("CLIENT_SELF_READ"), wrap(async (req, res) => ok(res, await announcements.liveFor({ tenantId: req.user?.tenantId }))))

export default router
