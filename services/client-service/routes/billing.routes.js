import { Router } from "express"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { ok, okList } from "../utils/response.js"
import * as billing from "../services/billing.service.js"
import { listDeletedDrives } from "../services/adminDrives.service.js"

const router = Router()

// Platform administrators only (SUPER_ADMIN carries SETTINGS_WRITE): this is the owner's view of what every client owes.
const adminOnly = [authenticate, requirePermission("SETTINGS_WRITE")]
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res) } catch (error) { next(error) } }
const sendCsv = (res, { filename, csv }) => {
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Cache-Control", "no-store")
    res.send(csv)
}

// Drives organizations have deleted (hidden from them, restorable), so a deletion is never invisible to the platform owner.
router.get("/admin/deleted-drives", ...adminOnly, wrap(async (req, res) => {
    const { items, total, page, pageSize } = await listDeletedDrives(req.query)
    okList(res, items, { total, page, pageSize })
}))
router.get("/admin/billing/summary", ...adminOnly, wrap(async (req, res) => ok(res, await billing.getSummary(req.query))))
router.get("/admin/billing/export", ...adminOnly, wrap(async (req, res) => sendCsv(res, await billing.exportSummaryCsv(req.query))))
router.get("/admin/billing/organizations/:key", ...adminOnly, wrap(async (req, res) => ok(res, await billing.getOrganization(req.params.key, req.query))))
router.get("/admin/billing/organizations/:key/lines", ...adminOnly, wrap(async (req, res) => {
    const { items, total, page, pageSize } = await billing.listLines(req.params.key, req.query)
    okList(res, items, { total, page, pageSize })
}))
router.get("/admin/billing/organizations/:key/export", ...adminOnly, wrap(async (req, res) => sendCsv(res, await billing.exportOrganizationCsv(req.params.key, req.query))))
router.put("/admin/billing/rates/:key", ...adminOnly, wrap(async (req, res) => ok(res, await billing.saveRates(req.params.key, req.body || {}, req.user?.email || req.user?.sub))))

export default router
