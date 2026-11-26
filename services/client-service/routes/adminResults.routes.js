import { Router } from "express"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { ok, okList } from "../utils/response.js"
import * as adminResults from "../services/adminResults.service.js"

const router = Router()

// Platform administrators only (SUPER_ADMIN carries SETTINGS_WRITE). Read-only: the owner looks at any organization's online-test
// results, the paper's layout and a sanity check of the scores, without signing in as that organization.
const adminOnly = [authenticate, requirePermission("SETTINGS_WRITE")]
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res) } catch (error) { next(error) } }

router.get("/admin/oa-results/organizations", ...adminOnly, wrap(async (req, res) => ok(res, await adminResults.listOrganizations())))
router.get("/admin/oa-results/organizations/:key/tests", ...adminOnly, wrap(async (req, res) => ok(res, await adminResults.listTests(req.params.key))))
router.get("/admin/oa-results/tests/:id/results", ...adminOnly, wrap(async (req, res) => {
    const { items, ...meta } = await adminResults.testResults(req.params.id, req.query)
    okList(res, items, meta)
}))
router.get("/admin/oa-results/tests/:id/paper", ...adminOnly, wrap(async (req, res) => ok(res, await adminResults.testPaper(req.params.id))))
router.get("/admin/oa-results/tests/:id/insights", ...adminOnly, wrap(async (req, res) => ok(res, await adminResults.testInsights(req.params.id))))
router.get("/admin/oa-results/tests/:id/attempts/:attemptId", ...adminOnly, wrap(async (req, res) => ok(res, await adminResults.testAttempt(req.params.id, req.params.attemptId))))

export default router
