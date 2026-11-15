import { Router } from "express"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { OaAccount } from "../models/oa.model.js"
import { ApiError, ok, okList } from "../utils/response.js"
import { OA_ROLES, requireOa } from "../utils/oaSecurity.js"
import * as accounts from "../services/oaAccount.service.js"
import * as assessments from "../services/oaAssessment.service.js"
import * as exam from "../services/oaExam.service.js"
import { aiConfigured } from "../services/oaAi.service.js"

// The Online Assessment room. Mounted at /api/v1/oa. Its sign-in and tokens are separate from the platform's, so
// the same email can exist here and as an organization admin, college admin or candidate at the same time.
const router = Router()

const handle = (fn, { list = false } = {}) => async (req, res, next) => {
    try {
        res.setHeader("Cache-Control", "no-store")
        const data = await fn(req)
        if (list) { const { items, ...meta } = data; return okList(res, items, meta) }
        ok(res, data)
    } catch (error) { next(error) }
}

// A suspended account stops working at once, not when its token expires. Cached briefly to spare the database.
const activeCache = new Map()
const requireActiveAdmin = async (req, res, next) => {
    try {
        const id = req.oa.accountId
        const hit = activeCache.get(id)
        if (!hit || hit.until < Date.now()) {
            const active = Boolean(await OaAccount.exists({ _id: id, status: "ACTIVE" }))
            activeCache.set(id, { active, until: Date.now() + 15000 })
            if (!active) throw new ApiError(403, "ACCOUNT_INACTIVE", "This account is not active.")
        } else if (!hit.active) throw new ApiError(403, "ACCOUNT_INACTIVE", "This account is not active.")
        next()
    } catch (error) { next(error) }
}

const admin = [requireOa(OA_ROLES.ADMIN), requireActiveAdmin]
const student = [requireOa(OA_ROLES.STUDENT)]
const clientIp = (req) => req.ip

// ---- public ----
router.post("/oa/auth/register", handle((req) => accounts.register(req.body)))
router.post("/oa/auth/login", handle((req) => accounts.login(req.body || {})))
router.post("/oa/exam/login", handle((req) => exam.studentLogin(req.body || {})))

// ---- platform super admin: the checker ----
const platform = [authenticate, requirePermission("CLIENT_APPROVE")]
router.get("/oa/platform/accounts", ...platform, handle((req) => accounts.listAccounts(req.query), { list: true }))
router.post("/oa/platform/accounts/:id/:action", ...platform, handle((req) => accounts.review(req.params.id, { action: req.params.action.replace(/-/g, "_"), note: req.body?.note }, req.user.sub)))

// ---- OA admin ----
router.get("/oa/me", ...admin, handle((req) => accounts.getMine(req.oa.accountId).then((account) => ({ ...account, aiAvailable: aiConfigured() }))))
router.get("/oa/dashboard", ...admin, handle((req) => assessments.dashboard(req.oa.accountId)))

router.get("/oa/assessments", ...admin, handle((req) => assessments.listAssessments(req.oa.accountId, req.query), { list: true }))
router.post("/oa/assessments", ...admin, handle((req) => assessments.createAssessment(req.oa.accountId, req.body)))
router.get("/oa/assessments/:id", ...admin, handle((req) => assessments.getAssessment(req.oa.accountId, req.params.id)))
router.patch("/oa/assessments/:id", ...admin, handle((req) => assessments.updateAssessment(req.oa.accountId, req.params.id, req.body)))
router.post("/oa/assessments/:id/publish", ...admin, handle((req) => assessments.publish(req.oa.accountId, req.params.id)))
router.post("/oa/assessments/:id/unpublish", ...admin, handle((req) => assessments.unpublish(req.oa.accountId, req.params.id)))
router.post("/oa/assessments/:id/archive", ...admin, handle((req) => assessments.archive(req.oa.accountId, req.params.id)))
router.post("/oa/assessments/:id/next-round", ...admin, handle((req) => assessments.createNextRound(req.oa.accountId, req.params.id, req.body || {})))

router.post("/oa/assessments/:id/questions", ...admin, handle((req) => assessments.addQuestions(req.oa.accountId, req.params.id, req.body)))
router.post("/oa/assessments/:id/questions/generate", ...admin, handle((req) => assessments.aiDraft(req.oa.accountId, req.params.id, req.body)))
router.patch("/oa/assessments/:id/questions/:questionId", ...admin, handle((req) => assessments.updateQuestion(req.oa.accountId, req.params.id, req.params.questionId, req.body)))
router.delete("/oa/assessments/:id/questions/:questionId", ...admin, handle((req) => assessments.deleteQuestion(req.oa.accountId, req.params.id, req.params.questionId)))

router.get("/oa/assessments/:id/students", ...admin, handle((req) => assessments.listStudents(req.oa.accountId, req.params.id, req.query), { list: true }))
router.post("/oa/assessments/:id/students", ...admin, handle((req) => assessments.addStudents(req.oa.accountId, req.params.id, req.body)))
router.post("/oa/assessments/:id/students/invite", ...admin, handle((req) => assessments.sendInvites(req.oa.accountId, req.params.id, req.body || {})))
router.delete("/oa/assessments/:id/students/:studentId", ...admin, handle((req) => assessments.removeStudent(req.oa.accountId, req.params.id, req.params.studentId)))

router.get("/oa/assessments/:id/live", ...admin, handle((req) => assessments.live(req.oa.accountId, req.params.id)))
router.get("/oa/assessments/:id/results", ...admin, handle((req) => assessments.results(req.oa.accountId, req.params.id, req.query), { list: true }))
router.get("/oa/assessments/:id/results/export", ...admin, async (req, res, next) => {
    try {
        const { filename, csv } = await assessments.exportResultsCsv(req.oa.accountId, req.params.id, req.query)
        res.setHeader("Content-Type", "text/csv; charset=utf-8")
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
        res.send(`﻿${csv}`)
    } catch (error) { next(error) }
})
router.get("/oa/assessments/:id/attempts/:attemptId", ...admin, handle((req) => assessments.attemptDetail(req.oa.accountId, req.params.id, req.params.attemptId)))
router.put("/oa/assessments/:id/attempts/:attemptId/grades", ...admin, handle((req) => assessments.gradeManually(req.oa.accountId, req.params.id, req.params.attemptId, req.body)))
router.put("/oa/assessments/:id/attempts/:attemptId/decision", ...admin, handle((req) => assessments.setDecision(req.oa.accountId, req.params.id, req.params.attemptId, req.body?.decision ?? null)))

// ---- student ----
router.get("/oa/exam/session", ...student, handle((req) => exam.session(req.oa)))
router.post("/oa/exam/start", ...student, handle((req) => exam.start(req.oa, req.body || {}, { ip: clientIp(req) })))
router.get("/oa/exam/paper", ...student, handle((req) => exam.getPaper(req.oa)))
router.put("/oa/exam/answers", ...student, handle((req) => exam.saveAnswers(req.oa, req.body)))
router.post("/oa/exam/heartbeat", ...student, handle((req) => exam.heartbeat(req.oa, req.body || {})))
router.post("/oa/exam/violation", ...student, handle((req) => exam.reportViolation(req.oa, req.body || {})))
router.post("/oa/exam/submit", ...student, handle((req) => exam.submit(req.oa)))

export default router
