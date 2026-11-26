import { Router } from "express"
import multer from "multer"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { OaAccount } from "../models/oa.model.js"
import { ApiError, ok, okList } from "../utils/response.js"
import { OA_ROLES, requireOa } from "../utils/oaSecurity.js"
import * as accounts from "../services/oaAccount.service.js"
import * as assessments from "../services/oaAssessment.service.js"
import * as exam from "../services/oaExam.service.js"
import { inviteToAiInterview } from "../services/oaAiPart.service.js"
import * as drives from "../services/oaDrive.service.js"
import { brandForAssessmentId, resolveClientLogo, resolveLogo } from "../services/oaBrand.service.js"
import { placeName } from "../services/oaPlace.service.js"
import { rateLimit } from "../utils/oaSecurity.js"
import { aiConfigured, aiStatus } from "../services/oaAi.service.js"
import { VIDEO_MAX_BYTES, verifyVideoSignature } from "../utils/oaVideo.js"

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
// The gateway and the web server sit in front of this service, so the socket address is theirs. The web server's
// own header is preferred; it is shown to the candidate and the organizer for the record, never used to allow anything.
const clientIp = (req) => {
    const real = String(req.headers["x-real-ip"] || "").trim()
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()
    return (real || forwarded || req.ip || "").replace(/^::ffff:/, "").slice(0, 64) || null
}

// One recorded answer, buffered in memory on its way to object storage.
const videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: VIDEO_MAX_BYTES, files: 1 },
    // No filter on the declared type: the file's contents are checked (and a precise reason given) when it is saved.
}).single("video")
const receiveVideo = (req, res, next) => videoUpload(req, res, (error) => {
    if (!error) return next()
    next(new ApiError(400, "VALIDATION_ERROR", error.code === "LIMIT_FILE_SIZE" ? `The recording is too large (the limit is ${Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} MB). Record a shorter answer.` : "The recording could not be read. Record it again."))
})

// Say so in the log when a request is slow, with how long it took, so a slow server can be pinned down to a route.
router.use((req, res, next) => {
    const started = Date.now()
    res.on("finish", () => {
        const ms = Date.now() - started
        if (ms > 1500) console.warn(`[client-service] SLOW ${req.method} ${req.originalUrl.split("?")[0]} took ${ms}ms (status ${res.statusCode})`)
    })
    next()
})

// ---- public ----
router.post("/oa/auth/register", handle((req) => accounts.register(req.body)))
router.post("/oa/auth/login", handle((req) => accounts.login(req.body || {})))
router.post("/oa/exam/login", handle((req) => exam.studentLogin(req.body || {})))
// What we can see of the visitor's connection, shown to them before they sign in.
router.get("/oa/exam/whoami", handle((req) => ({ ip: clientIp(req) })))
// Open registration: a candidate registers through the link the organizer shared; the organizer approves them later.
router.get("/oa/join/:token", handle((req) => assessments.registrationInfo(req.params.token)))
router.post("/oa/join/:token", handle((req) => assessments.registerSelf(req.params.token, req.body || {}, { ip: clientIp(req) })))
// A place name for coordinates the candidate's browser gave, so the sign-in page can show "Gurugram, Haryana" instead of numbers.
router.get("/oa/exam/place", handle(async (req) => {
    rateLimit({ key: `oa-place:${clientIp(req) || "unknown"}`, max: 40, windowMs: 60 * 1000 })
    return { place: await placeName(req.query.lat, req.query.lng) }
}))
// The organization behind a test (name, logo), so the sign-in page can look like theirs. Nothing else about the test.
router.get("/oa/exam/brand", handle(async (req) => {
    const brand = await brandForAssessmentId(String(req.query.a || ""))
    return { name: brand.name, logoPath: brand.logoPath }
}))
// The logo itself: public (a mail app or a signed-out page cannot send a login), and cacheable. By Online Assessment account
// or, for emails and pages of AI interviews, by the organization's own id.
router.get(["/oa/brand/:accountId/logo", "/oa/brand/client/:clientId/logo"], async (req, res, next) => {
    try {
        const logo = req.params.clientId ? await resolveClientLogo(req.params.clientId) : await resolveLogo(req.params.accountId)
        if (!logo) return next(new ApiError(404, "NOT_FOUND", "No logo."))
        res.setHeader("Cache-Control", "public, max-age=1800")
        if (logo.redirect) return res.redirect(302, logo.redirect)
        res.setHeader("Content-Type", logo.contentType)
        res.setHeader("X-Content-Type-Options", "nosniff")
        return res.send(logo.buffer)
    } catch (error) { return next(error) }
})

// A recorded video answer, opened from the organizer's report through a short-lived signed link.
router.get("/oa/video/:attemptId/:questionId", async (req, res, next) => {
    try {
        const { attemptId, questionId } = req.params
        if (!verifyVideoSignature(attemptId, questionId, req.query.exp, req.query.sig)) throw new ApiError(403, "FORBIDDEN", "This link has expired. Reopen the report.")
        const file = await exam.videoStream(attemptId, questionId, req.headers.range)
        res.status(file.contentRange ? 206 : 200)
        res.setHeader("Content-Type", file.contentType || "video/webm")
        res.setHeader("Accept-Ranges", "bytes")
        res.setHeader("Cache-Control", "private, max-age=3600")      // the link is signed and short-lived; replaying or seeking need not refetch
        if (file.contentLength) res.setHeader("Content-Length", file.contentLength)
        if (file.contentRange) res.setHeader("Content-Range", file.contentRange)
        file.stream.on("error", next).pipe(res)
    } catch (error) { next(error) }
})

// ---- organization admins: straight in from their platform sign-in ----
router.post("/oa/auth/org-session", authenticate, requirePermission("CLIENT_SELF_READ"), handle((req) => accounts.orgSession(req.user)))

// ---- platform super admin: the checker ----
const platform = [authenticate, requirePermission("CLIENT_APPROVE")]
router.get("/oa/platform/accounts", ...platform, handle((req) => accounts.listAccounts(req.query), { list: true }))
router.post("/oa/platform/accounts/:id/:action", ...platform, handle((req) => accounts.review(req.params.id, { action: req.params.action.replace(/-/g, "_"), note: req.body?.note }, req.user.sub)))

// ---- OA admin ----
router.get("/oa/me", ...admin, handle((req) => accounts.getMine(req.oa.accountId).then((account) => ({ ...account, aiAvailable: aiConfigured() }))))
router.get("/oa/ai/status", ...admin, handle(() => aiStatus()))
router.get("/oa/dashboard", ...admin, handle((req) => assessments.dashboard(req.oa.accountId)))

router.get("/oa/drives", ...admin, handle((req) => drives.listDrives(req.oa.accountId, req.query), { list: true }))
router.post("/oa/drives", ...admin, handle((req) => drives.createDrive(req.oa.accountId, req.body || {})))
router.get("/oa/drives/:id", ...admin, handle((req) => drives.getDrive(req.oa.accountId, req.params.id)))
router.patch("/oa/drives/:id", ...admin, handle((req) => drives.updateDrive(req.oa.accountId, req.params.id, req.body || {})))
router.delete("/oa/drives/:id", ...admin, handle(async (req) => { const account = await OaAccount.findById(req.oa.accountId).select("tenantId email").lean(); return drives.deleteDrive(req.oa.accountId, req.params.id, account?.email || null, account?.tenantId || null) }))
router.post("/oa/drives/:id/restore", ...admin, handle(async (req) => { const account = await OaAccount.findById(req.oa.accountId).select("tenantId").lean(); return drives.restoreDrive(req.oa.accountId, req.params.id, account?.tenantId || null) }))
router.post("/oa/drives/:id/rounds", ...admin, handle((req) => drives.addRound(req.oa.accountId, req.params.id, req.body || {})))

router.get("/oa/assessments", ...admin, handle((req) => assessments.listAssessments(req.oa.accountId, req.query), { list: true }))
router.post("/oa/assessments", ...admin, handle((req) => assessments.createAssessment(req.oa.accountId, req.body)))
router.get("/oa/assessments/:id", ...admin, handle(async (req) => { await drives.ensureDrives(req.oa.accountId); return assessments.getAssessment(req.oa.accountId, req.params.id) }))
router.patch("/oa/assessments/:id", ...admin, handle((req) => assessments.updateAssessment(req.oa.accountId, req.params.id, req.body)))
router.post("/oa/assessments/:id/publish", ...admin, handle((req) => assessments.publish(req.oa.accountId, req.params.id)))
router.post("/oa/assessments/:id/unpublish", ...admin, handle((req) => assessments.unpublish(req.oa.accountId, req.params.id)))
router.post("/oa/assessments/:id/archive", ...admin, handle((req) => assessments.archive(req.oa.accountId, req.params.id)))
router.post("/oa/assessments/:id/next-round", ...admin, handle((req) => drives.nextRoundOf(req.oa.accountId, req.params.id, req.body || {})))

router.post("/oa/assessments/:id/questions", ...admin, handle((req) => assessments.addQuestions(req.oa.accountId, req.params.id, req.body)))
router.post("/oa/assessments/:id/questions/generate", ...admin, handle((req) => assessments.aiDraft(req.oa.accountId, req.params.id, req.body)))
router.patch("/oa/assessments/:id/questions/:questionId", ...admin, handle((req) => assessments.updateQuestion(req.oa.accountId, req.params.id, req.params.questionId, req.body)))
router.post("/oa/assessments/:id/questions/bulk-delete", ...admin, handle((req) => assessments.deleteQuestions(req.oa.accountId, req.params.id, req.body?.ids)))
router.delete("/oa/assessments/:id/sections/:sectionId", ...admin, handle((req) => assessments.deleteSection(req.oa.accountId, req.params.id, req.params.sectionId)))
router.delete("/oa/assessments/:id/questions/:questionId", ...admin, handle((req) => assessments.deleteQuestion(req.oa.accountId, req.params.id, req.params.questionId)))

router.get("/oa/assessments/:id/students", ...admin, handle((req) => assessments.listStudents(req.oa.accountId, req.params.id, req.query), { list: true }))
router.post("/oa/assessments/:id/students", ...admin, handle((req) => assessments.addStudents(req.oa.accountId, req.params.id, req.body)))
router.post("/oa/assessments/:id/students/decide", ...admin, handle((req) => assessments.decideStudents(req.oa.accountId, req.params.id, req.body || {})))
router.put("/oa/assessments/:id/registration", ...admin, handle((req) => assessments.setRegistration(req.oa.accountId, req.params.id, req.body || {})))
router.post("/oa/assessments/:id/students/invite", ...admin, handle((req) => assessments.sendInvites(req.oa.accountId, req.params.id, req.body || {})))
router.delete("/oa/assessments/:id/students/:studentId", ...admin, handle((req) => assessments.removeStudent(req.oa.accountId, req.params.id, req.params.studentId)))

router.get("/oa/assessments/:id/live", ...admin, handle((req) => assessments.live(req.oa.accountId, req.params.id)))
router.get("/oa/assessments/:id/results", ...admin, handle((req) => assessments.results(req.oa.accountId, req.params.id, req.query), { list: true }))
router.post("/oa/assessments/:id/ai-invites", ...admin, handle((req) => inviteToAiInterview(req.oa.accountId, req.params.id, req.body || {})))
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
router.post("/oa/exam/run", ...student, handle((req) => exam.runCode(req.oa, req.body || {})))
router.get("/oa/exam/session", ...student, handle((req) => exam.session(req.oa)))
router.put("/oa/exam/slot", ...student, handle((req) => exam.bookSlot(req.oa, req.body || {})))
router.post("/oa/exam/start", ...student, handle((req) => exam.start(req.oa, req.body || {}, { ip: clientIp(req) })))
router.get("/oa/exam/paper", ...student, handle((req) => exam.getPaper(req.oa)))
router.put("/oa/exam/answers", ...student, handle((req) => exam.saveAnswers(req.oa, req.body)))
router.post("/oa/exam/video/:questionId", ...student, receiveVideo, handle((req) => exam.uploadVideo(req.oa, req.params.questionId, req.file, { durationSec: req.body?.durationSec })))
router.post("/oa/exam/heartbeat", ...student, handle((req) => exam.heartbeat(req.oa, req.body || {})))
router.post("/oa/exam/violation", ...student, handle((req) => exam.reportViolation(req.oa, req.body || {})))
router.post("/oa/exam/submit", ...student, handle((req) => exam.submit(req.oa)))
router.post("/oa/exam/ai-interview", ...student, handle((req) => exam.startAiInterview(req.oa)))

export default router
