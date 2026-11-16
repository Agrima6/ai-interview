import mongoose from "mongoose"
import { OaAssessment, OaAttempt, OaEvent, OaStudent } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import { OA_ROLES, clearRateLimit, codesMatch, normalizeEmail, rateLimit, signOaToken } from "../utils/oaSecurity.js"
import { sectionName, studentQuestionView } from "../utils/oaQuestions.js"
import { brandForAssessmentId } from "./oaBrand.service.js"
import { placeName } from "./oaPlace.service.js"
import { canRunLanguage, runCases, runnableLanguages } from "./oaCodeRunner.service.js"
import { RECORDINGS_BUCKET, getObjectStream, uploadBuffer } from "../config/s3Client.js"
import { sniffVideoType, videoObjectKey } from "../utils/oaVideo.js"
import { SLOT_CHANGE_CUTOFF_MINUTES, attemptDeadline, buildPaperOrder, effectiveSchedule, gradeAttempt, inWaitingRoom, schedulePhase, slotChangeDeadline } from "../utils/oaExam.js"

const GRACE_MS = 10 * 1000          // network slack when the last autosave lands just after the deadline
const SNAPSHOT_MAX_CHARS = 120000
const DEDUPE_MS = 4000              // blur + visibilitychange + fullscreenchange often fire together for one act

// What the proctoring client may report, whether it counts toward the strike limit, and which setting turns it on.
const VIOLATIONS = {
    TAB_SWITCH: { counted: true }, WINDOW_BLUR: { counted: true }, FULLSCREEN_EXIT: { counted: true, needs: "requireFullscreen" },
    COPY_PASTE: { counted: true, needs: "blockCopyPaste" }, SCREEN_SHARE_STOPPED: { counted: true, needs: "requireScreenShare" },
    CAMERA_OFF: { counted: true, needs: "requireCamera" }, NO_FACE: { counted: true, needs: "faceChecks" },
    MULTIPLE_FACES: { counted: true, needs: "faceChecks" }, LOOKING_AWAY: { counted: true, needs: "faceChecks" },
    DEVTOOLS: { counted: true }, MULTIPLE_MONITORS: { counted: true },
    RIGHT_CLICK: { counted: false }, SHORTCUT_BLOCKED: { counted: false }, RESUMED: { counted: false }, FACE_CHECK_UNAVAILABLE: { counted: false },
}

const asObject = (q) => (q.toObject ? q.toObject() : q)

// ---------- sign-in ----------

export const studentLogin = async ({ assessmentId, email, code }) => {
    if (!mongoose.isValidObjectId(assessmentId)) throw new ApiError(401, "INVALID_CREDENTIALS", "The email or access code is not right.")
    const emailNormalized = normalizeEmail(email)
    // A whole class signs in at the same minute: the per-test ceiling is generous, the per-student one is tight.
    rateLimit({ key: `oa-exam-all:${assessmentId}`, max: 3000, windowMs: 15 * 60 * 1000 })
    const limiterKey = `oa-exam:${assessmentId}:${emailNormalized}`
    rateLimit({ key: limiterKey, max: 8, windowMs: 15 * 60 * 1000 })

    const [assessment, student] = await Promise.all([
        OaAssessment.findOne({ _id: assessmentId, status: "PUBLISHED" }).select("title schedule accountId"),
        OaStudent.findOne({ assessmentId, emailNormalized }),
    ])
    // One message whichever part was wrong, so the form cannot be used to discover who is invited.
    // Someone still waiting for approval (or turned down) cannot sign in, even if they somehow know their code.
    if (student && ["PENDING", "REJECTED"].includes(student.approval?.status)) throw new ApiError(401, "INVALID_CREDENTIALS", "The email or access code is not right. Check the invitation email.")
    if (!assessment || !student || !codesMatch(code, student.codeHash)) throw new ApiError(401, "INVALID_CREDENTIALS", "The email or access code is not right. Check the invitation email.")

    clearRateLimit(limiterKey)
    const secondsToClose = Math.ceil((new Date(assessment.schedule.endAt).getTime() - Date.now()) / 1000)
    // An open window lets someone begin in its last minute and still get the whole duration.
    const extra = assessment.schedule.mode === "FLEXIBLE" ? assessment.schedule.durationMinutes * 60 : 0
    const ttl = Math.min(Math.max(secondsToClose + extra + 2 * 3600, 3600), 14 * 24 * 3600)
    const token = signOaToken({ sub: String(student._id), role: OA_ROLES.STUDENT, studentId: String(student._id), assessmentId: String(assessment._id), accountId: String(assessment.accountId) }, ttl)
    return { token, expiresIn: ttl }
}

const loadContext = async (ctx) => {
    const [assessment, student, attempt] = await Promise.all([
        OaAssessment.findOne({ _id: ctx.assessmentId, status: "PUBLISHED" }),
        OaStudent.findById(ctx.studentId),
        OaAttempt.findOne({ assessmentId: ctx.assessmentId, studentId: ctx.studentId }),
    ])
    if (!assessment || !student) throw new ApiError(404, "NOT_FOUND", "This test is not available.")
    return { assessment, student, attempt }
}

// ---------- finalising ----------

/** End an attempt exactly once (a second caller gets the already-finished row) and grade it. */
export const finalizeAttempt = async (attemptId, { status, reason = null }) => {
    const now = new Date()
    const current = await OaAttempt.findById(attemptId)
    if (!current) return null
    if (current.status !== "IN_PROGRESS") return current
    const submittedAt = status === "AUTO_SUBMITTED" ? new Date(Math.min(now, current.deadline)) : now
    const claimed = await OaAttempt.findOneAndUpdate({ _id: attemptId, status: "IN_PROGRESS" }, { $set: { status, submittedAt, endReason: reason } }, { new: true })
    if (!claimed) return OaAttempt.findById(attemptId)
    const assessment = await OaAssessment.findById(claimed.assessmentId)
    const result = gradeAttempt({ questions: assessment.questions.map(asObject), answers: claimed.answers || {}, grades: claimed.grades || {}, settings: assessment.settings?.toObject?.() || {} })
    const saved = await OaAttempt.findByIdAndUpdate(attemptId, { $set: { grades: result.grades, score: result.score, maxScore: result.maxScore, percent: result.percent, gradingStatus: result.gradingStatus } }, { new: true })
    // Coding answers with test cases are run and scored in the background, so submitting never waits for the code runner.
    setImmediate(() => autoGradeCoding(attemptId).catch((e) => console.error("[client-service] OA coding auto-grade failed:", e.message)))
    return saved
}

/** Run on a timer: anyone whose time is up is submitted for them, even if their browser is closed. */
export const finalizeExpiredAttempts = async () => {
    const overdue = await OaAttempt.find({ status: "IN_PROGRESS", deadline: { $lt: new Date(Date.now() - GRACE_MS) } }).select("_id").limit(300).lean()
    for (const a of overdue) await finalizeAttempt(a._id, { status: "AUTO_SUBMITTED", reason: "Time ran out" }).catch((e) => console.error("[client-service] OA auto-submit failed:", e.message))
    return overdue.length
}

const settleIfExpired = async (attempt) => {
    if (attempt.status === "IN_PROGRESS" && Date.now() > attempt.deadline.getTime() + GRACE_MS) {
        await finalizeAttempt(attempt._id, { status: "AUTO_SUBMITTED", reason: "Time ran out" })
        throw new ApiError(409, "TIME_UP", "Time is up. Your answers have been submitted.")
    }
}

// ---------- reading state ----------

const proctoringView = (p) => ({ level: p.level, requireCamera: p.requireCamera, requireScreenShare: p.requireScreenShare, requireFullscreen: p.requireFullscreen, faceChecks: p.faceChecks, blockCopyPaste: p.blockCopyPaste, requireLocation: Boolean(p.requireLocation), maxViolations: p.maxViolations, snapshotIntervalSec: p.snapshotIntervalSec })

const resultView = (assessment, attempt) => {
    if (!attempt || attempt.status === "IN_PROGRESS") return null
    const shown = assessment.settings.showResultToStudent && attempt.gradingStatus === "COMPLETE" && attempt.status !== "TERMINATED"
    return shown ? { score: attempt.score, maxScore: attempt.maxScore, percent: attempt.percent, passed: attempt.percent >= assessment.settings.passPercent } : null
}

const isSlotted = (assessment) => assessment.schedule?.mode === "SLOTS"

// The slots a student can pick from, with how many seats are left. `bookable` already accounts for the booking cut-off.
const slotChoices = async (assessment, student) => {
    const counts = await OaStudent.aggregate([{ $match: { assessmentId: assessment._id, slotId: { $ne: null } } }, { $group: { _id: "$slotId", n: { $sum: 1 } } }])
    const used = new Map(counts.map((c) => [c._id, c.n]))
    const now = Date.now()
    return assessment.schedule.slots.map((slot) => {
        const taken = used.get(slot.id) || 0
        const mine = student.slotId === slot.id
        const remaining = slot.capacity ? Math.max(slot.capacity - taken, 0) : null
        const open = now <= slotChangeDeadline(slot).getTime()
        return { id: slot.id, startAt: slot.startAt, capacity: slot.capacity || null, remaining, mine, bookable: open && (mine || remaining === null || remaining > 0), full: remaining === 0 && !mine, closed: !open }
    })
}

export const session = async (ctx) => {
    const { assessment, student, attempt } = await loadContext(ctx)
    const brand = await brandForAssessmentId(assessment._id)
    if (attempt) await settleIfExpired(attempt).catch((e) => { if (e.code !== "TIME_UP") throw e })
    const fresh = attempt ? await OaAttempt.findById(attempt._id) : null
    const slotted = isSlotted(assessment)
    const sched = effectiveSchedule(assessment.schedule, student.slotId)
    const slots = slotted ? await slotChoices(assessment, student) : undefined
    // A slotted test with no booking has no start time of its own yet: the student is either choosing, or too late to.
    const phase = sched ? schedulePhase(sched) : slots.some((x) => x.bookable) ? "CHOOSE_SLOT" : "NO_SLOT"
    const finished = fresh && fresh.status !== "IN_PROGRESS"
    const { durationMinutes, lateEntryMinutes, timezone } = assessment.schedule
    return {
        serverNow: new Date(),
        student: { name: student.name, email: student.email },
        assessment: {
            id: String(assessment._id), brand: { name: brand.name, logoPath: brand.logoPath }, title: assessment.title, description: assessment.description, instructions: assessment.instructions,
            schedule: sched ? { mode: assessment.schedule.mode, startAt: sched.startAt, endAt: sched.endAt, durationMinutes, lateEntryMinutes, timezone } : { mode: "SLOTS", startAt: null, endAt: null, durationMinutes, lateEntryMinutes, timezone },
            phase, waitingRoom: sched ? inWaitingRoom(sched) : false,
            slots, slotCutoffMinutes: slotted ? SLOT_CHANGE_CUTOFF_MINUTES : undefined,
            questionCount: assessment.questions.length, totalMarks: assessment.questions.reduce((sum, q) => sum + q.marks, 0),
            sectionCount: assessment.sections.length, allowBackNavigation: assessment.settings.allowBackNavigation,
            proctoring: proctoringView(assessment.proctoring),
        },
        attempt: fresh ? { status: fresh.status, startedAt: fresh.startedAt, deadline: fresh.deadline, submittedAt: fresh.submittedAt, endReason: fresh.endReason } : null,
        canStart: !finished && (fresh ? fresh.status === "IN_PROGRESS" : phase === "OPEN"),
        result: resultView(assessment, fresh),
    }
}

/** A student books, or changes to, one of the offered start times. Seats are never oversold. */
export const bookSlot = async (ctx, { slotId } = {}) => {
    const { assessment, student, attempt } = await loadContext(ctx)
    if (!isSlotted(assessment)) throw new ApiError(409, "NO_SLOTS", "This test has one start time for everyone, so there is nothing to choose.")
    if (attempt) throw new ApiError(409, "ALREADY_STARTED", "You have already started this test, so your slot cannot change.")
    const slots = assessment.schedule.slots
    const slot = slots.find((x) => x.id === String(slotId))
    if (!slot) throw new ApiError(400, "VALIDATION_ERROR", "That time slot does not exist.", { slotId: "Choose one of the listed times." })
    if (student.slotId === slot.id) return { slotId: slot.id }

    const now = Date.now()
    if (now > slotChangeDeadline(slot).getTime()) throw new ApiError(409, "SLOT_CLOSED", `Booking for this slot closed ${SLOT_CHANGE_CUTOFF_MINUTES} minutes before it starts. Choose another time.`)
    const current = slots.find((x) => x.id === student.slotId)
    if (current && now > slotChangeDeadline(current).getTime()) throw new ApiError(409, "SLOT_LOCKED", `Your slot starts in under ${SLOT_CHANGE_CUTOFF_MINUTES} minutes, so it can no longer be changed.`)

    const previous = { slotId: student.slotId ?? null, slotBookedAt: student.slotBookedAt ?? null }
    const claimed = await OaStudent.findOneAndUpdate({ _id: student._id, slotId: previous.slotId }, { $set: { slotId: slot.id, slotBookedAt: new Date() } }, { new: true })
    if (!claimed) throw new ApiError(409, "CONFLICT", "Your booking changed in another window. Reload and try again.")
    if (slot.capacity) {
        // Book first, then count: if the slot overflowed, undo this booking. Two people racing for the last seat may both
        // be told to retry, but the slot is never over capacity.
        const taken = await OaStudent.countDocuments({ assessmentId: assessment._id, slotId: slot.id })
        if (taken > slot.capacity) {
            await OaStudent.updateOne({ _id: student._id, slotId: slot.id }, { $set: previous })
            throw new ApiError(409, "SLOT_FULL", "That slot just filled up. Please choose another time.")
        }
    }
    return { slotId: slot.id }
}

const paperPayload = (assessment, attempt) => {
    const questions = new Map(assessment.questions.map((q) => [q.id, asObject(q)]))
    return {
        serverNow: new Date(), deadline: attempt.deadline, startedAt: attempt.startedAt, status: attempt.status,
        // Languages the candidate can run against the sample test cases (empty when no code runner is set up).
        runnableLanguages: runnableLanguages(),
        allowBackNavigation: assessment.settings.allowBackNavigation,
        proctoring: proctoringView(assessment.proctoring), violationCount: attempt.violationCount,
        sections: attempt.order.sections.map((s) => ({
            id: s.sectionId, number: assessment.sections.findIndex((x) => x.id === s.sectionId) + 1,
            title: sectionName(assessment.sections.find((x) => x.id === s.sectionId)?.title),
            questions: s.questionIds.map((qid) => questions.get(qid)).filter(Boolean).map((q) => studentQuestionView(q, attempt.order.optionOrder?.[q.id])),
        })),
        // A recorded video is reported as "recorded", never by where it is stored.
        answers: Object.fromEntries(Object.entries(attempt.answers || {}).map(([qid, a]) => [qid, a?.value?.videoKey ? { recorded: true, durationSec: a.value.durationSec ?? null } : a?.value ?? null])),
    }
}

// ---------- starting ----------

const pickEnvironment = (env = {}) => ({
    userAgent: String(env.userAgent || "").slice(0, 300), platform: String(env.platform || "").slice(0, 60),
    screenCount: Number.isFinite(Number(env.screenCount)) ? Number(env.screenCount) : null,
    screen: String(env.screen || "").slice(0, 30), timezone: String(env.timezone || "").slice(0, 60),
    language: String(env.language || "").slice(0, 20),
    browser: String(env.browser || "").slice(0, 60), os: String(env.os || "").slice(0, 60), device: String(env.device || "").slice(0, 40),
    ...coordinates(env),
})

// Latitude and longitude as the candidate's browser reported them (with their permission); null when it did not.
const coordinates = (env = {}) => {
    const latitude = Number(env.latitude); const longitude = Number(env.longitude); const accuracy = Number(env.accuracy)
    const valid = env.latitude !== null && env.latitude !== undefined && env.latitude !== "" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    return valid
        ? { latitude: Math.round(latitude * 1e6) / 1e6, longitude: Math.round(longitude * 1e6) / 1e6, accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.round(accuracy) : null }
        : { latitude: null, longitude: null, accuracy: null }
}

const NOT_OPEN = {
    UPCOMING: "The test has not started yet. You can enter when the start time arrives.",
    CLOSED_TO_ENTRY: "The late-entry window has closed, so you can no longer begin this test. Please contact your organizer.",
    ENDED: "This test has closed.",
}

export const start = async (ctx, { environment } = {}, { ip } = {}) => {
    const { assessment, student, attempt } = await loadContext(ctx)
    if (attempt) {
        if (attempt.status !== "IN_PROGRESS") throw new ApiError(409, "ALREADY_FINISHED", "You have already finished this test.")
        await settleIfExpired(attempt)
        await OaEvent.create({ attemptId: attempt._id, assessmentId: assessment._id, kind: "INFO", type: "RESUMED", detail: "Re-entered the test" })
        return paperPayload(assessment, attempt)
    }
    const sched = effectiveSchedule(assessment.schedule, student.slotId)
    if (!sched) throw new ApiError(409, "SLOT_REQUIRED", "Choose your time slot before you start.")
    const phase = schedulePhase(sched)
    if (phase !== "OPEN") throw new ApiError(409, "NOT_OPEN", NOT_OPEN[phase] || "The test is not open.")
    if (!assessment.questions.length) throw new ApiError(409, "NO_QUESTIONS", "This test has no questions yet.")
    const env = pickEnvironment(environment)
    // The place name is a nicety: wait a moment for it, never hold the candidate up.
    env.place = (await Promise.race([placeName(env.latitude, env.longitude), new Promise((resolve) => setTimeout(() => resolve(null), 2500))])) || null
    if (assessment.proctoring.requireLocation && env.latitude === null) throw new ApiError(409, "LOCATION_REQUIRED", "Allow location access in your browser to start this test. Your organizer requires it.")

    const _id = new mongoose.Types.ObjectId()
    const startedAt = new Date()
    const order = buildPaperOrder({ sections: assessment.sections.map(asObject), questions: assessment.questions.map(asObject), settings: assessment.settings, seed: String(_id) })
    try {
        const created = await OaAttempt.create({
            _id, accountId: assessment.accountId, assessmentId: assessment._id, studentId: ctx.studentId,
            startedAt, deadline: attemptDeadline(sched, startedAt), order, environment: env, ip: ip || null, lastHeartbeatAt: startedAt,
        })
        await OaEvent.create({ attemptId: created._id, assessmentId: assessment._id, kind: "INFO", type: "EXAM_STARTED", detail: "Started the test" })
        return paperPayload(assessment, created)
    } catch (error) {
        // Two tabs pressing Start at once: the unique index lets exactly one win; the other resumes the winner's attempt.
        if (error.code === 11000) return paperPayload(assessment, await OaAttempt.findOne({ assessmentId: assessment._id, studentId: ctx.studentId }))
        throw error
    }
}

export const getPaper = async (ctx) => {
    const { assessment, attempt } = await loadContext(ctx)
    if (!attempt) throw new ApiError(409, "NOT_STARTED", "You have not started this test.")
    await settleIfExpired(attempt)
    return paperPayload(assessment, attempt)
}

// ---------- answering ----------

const validAnswer = (question, value) => {
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) return { value: null }
    if (question.type === "MCQ" || question.type === "MSQ") {
        const ids = Array.isArray(value) ? value.map(String) : [String(value)]
        const known = new Set(question.options.map((o) => o.id))
        if (!ids.every((id) => known.has(id)) || new Set(ids).size !== ids.length) return { error: "That option does not belong to this question." }
        if (question.type === "MCQ" && ids.length > 1) return { error: "Choose only one option." }
        return { value: ids }
    }
    // A video answer is only ever written by the upload itself, so nothing typed here can point at someone else's file.
    if (question.type === "VIDEO") return { skip: true }
    if (question.type === "CODING") {
        const code = String(value?.code ?? "")
        const language = String(value?.language ?? question.codeLanguages[0] ?? "")
        if (code.length > 50000) return { error: "Your code is too long." }
        if (language && !question.codeLanguages.includes(language)) return { error: "That language is not allowed for this question." }
        return { value: { code, language } }
    }
    const text = String(value)
    if (text.length > (question.type === "SHORT" ? 3000 : 20000)) return { error: "Your answer is too long." }
    return { value: text }
}

export const saveAnswers = async (ctx, { answers } = {}) => {
    const { assessment, attempt } = await loadContext(ctx)
    if (!attempt) throw new ApiError(409, "NOT_STARTED", "You have not started this test.")
    if (attempt.status !== "IN_PROGRESS") throw new ApiError(409, "ALREADY_FINISHED", "This test has already been submitted.")
    await settleIfExpired(attempt)

    const inPaper = new Set(attempt.order.sections.flatMap((s) => s.questionIds))
    const byId = new Map(assessment.questions.map((q) => [q.id, asObject(q)]))
    const now = new Date()
    const $set = {}
    for (const item of (Array.isArray(answers) ? answers : []).slice(0, 50)) {
        const q = byId.get(item?.questionId)
        if (!q || !inPaper.has(q.id)) throw new ApiError(400, "VALIDATION_ERROR", "An answer refers to a question that is not on your paper.")
        const checked = validAnswer(q, item.value)
        if (checked.error) throw new ApiError(400, "VALIDATION_ERROR", checked.error, { [q.id]: checked.error })
        if (checked.skip) continue
        $set[`answers.${q.id}`] = { value: checked.value, savedAt: now }
    }
    if (Object.keys($set).length) await OaAttempt.updateOne({ _id: attempt._id, status: "IN_PROGRESS" }, { $set })
    return { savedAt: now, serverNow: now, deadline: attempt.deadline }
}

// ---------- video answers ----------

/** Store a candidate's recorded answer to a VIDEO question. Recording again replaces the earlier one. */
export const uploadVideo = async (ctx, questionId, file, { durationSec } = {}) => {
    const { assessment, attempt } = await loadContext(ctx)
    if (!attempt) throw new ApiError(409, "NOT_STARTED", "You have not started this test.")
    if (attempt.status !== "IN_PROGRESS") throw new ApiError(409, "ALREADY_FINISHED", "This test has already been submitted.")
    await settleIfExpired(attempt)
    const question = assessment.questions.find((q) => q.id === questionId)
    const inPaper = attempt.order.sections.some((s) => s.questionIds.includes(questionId))
    if (!question || !inPaper || question.type !== "VIDEO") throw new ApiError(400, "VALIDATION_ERROR", "That question does not take a video answer.")
    if (!file?.buffer?.length) {
        console.warn(`[client-service] OA video rejected: nothing arrived (file part ${file ? "was empty" : "missing"})`)
        throw new ApiError(400, "VALIDATION_ERROR", "The recording was empty. Record it again, speak for a few seconds, then press Stop.")
    }
    // Judge the file by what it is, not by the label the browser gave it.
    const mime = sniffVideoType(file.buffer)
    if (!mime) {
        console.warn(`[client-service] OA video rejected: declared type "${file.mimetype}", ${file.buffer.length} bytes, not a WebM or MP4 file`)
        throw new ApiError(400, "VALIDATION_ERROR", "The recording is not in a format we can play. Use the latest Chrome or Edge and record again.")
    }

    const key = videoObjectKey({ assessmentId: String(assessment._id), attemptId: String(attempt._id), questionId, mime })
    try {
        await uploadBuffer(RECORDINGS_BUCKET, key, file.buffer, mime)
    } catch (error) {
        console.error("[client-service] OA video upload failed:", error.message)
        throw new ApiError(503, "STORAGE_UNAVAILABLE", "Your recording could not be saved just now. Please try again.")
    }
    const seconds = Number(durationSec)
    const now = new Date()
    const value = { videoKey: key, mime, size: file.buffer.length, durationSec: Number.isFinite(seconds) && seconds >= 0 ? Math.min(Math.round(seconds), 3600) : null }
    const saved = await OaAttempt.updateOne({ _id: attempt._id, status: "IN_PROGRESS" }, { $set: { [`answers.${questionId}`]: { value, savedAt: now } } })
    if (!saved.modifiedCount) throw new ApiError(409, "ALREADY_FINISHED", "This test has already been submitted.")
    return { recorded: true, durationSec: value.durationSec, savedAt: now }
}

/** The stored recording behind a signed link (the link itself is checked by the route). */
export const videoStream = async (attemptId, questionId, range) => {
    if (!mongoose.isValidObjectId(attemptId)) throw new ApiError(404, "NOT_FOUND", "Recording not found.")
    const attempt = await OaAttempt.findById(attemptId).select("answers").lean()
    const key = attempt?.answers?.[questionId]?.value?.videoKey
    if (!key) throw new ApiError(404, "NOT_FOUND", "Recording not found.")
    try {
        return await getObjectStream(RECORDINGS_BUCKET, key, range)
    } catch (error) {
        console.error("[client-service] OA video read failed:", error.message)
        throw new ApiError(404, "NOT_FOUND", "Recording not found.")
    }
}

// ---------- proctoring ----------

const maybeTerminate = async (attempt, assessment, count) => {
    if (count < assessment.proctoring.maxViolations) return null
    return finalizeAttempt(attempt._id, { status: "TERMINATED", reason: `Ended automatically after ${count} proctoring violations` })
}

const stateOf = (attempt, assessment) => ({
    serverNow: new Date(), deadline: attempt.deadline, status: attempt.status, endReason: attempt.endReason,
    violationCount: attempt.violationCount, maxViolations: assessment.proctoring.maxViolations,
})

const validImage = (image) => (typeof image === "string" && image.startsWith("data:image/jpeg;base64,") && image.length <= SNAPSHOT_MAX_CHARS ? image : null)

export const heartbeat = async (ctx, { snapshot } = {}) => {
    const { assessment, attempt } = await loadContext(ctx)
    if (!attempt) throw new ApiError(409, "NOT_STARTED", "You have not started this test.")
    if (attempt.status !== "IN_PROGRESS") return stateOf(attempt, assessment)
    if (Date.now() > attempt.deadline.getTime() + GRACE_MS) return stateOf(await finalizeAttempt(attempt._id, { status: "AUTO_SUBMITTED", reason: "Time ran out" }), assessment)

    const now = new Date()
    const gapSec = attempt.lastHeartbeatAt ? Math.round((now - attempt.lastHeartbeatAt) / 1000) : 0
    const $set = { lastHeartbeatAt: now }
    const image = validImage(snapshot)
    const intervalMs = assessment.proctoring.snapshotIntervalSec * 1000
    if (image && (!attempt.lastSnapshotAt || now - attempt.lastSnapshotAt >= intervalMs * 0.5)) {
        await OaEvent.create({ attemptId: attempt._id, assessmentId: assessment._id, kind: "SNAPSHOT", type: "PERIODIC", image })
        $set.lastSnapshotAt = now
    }
    if (gapSec > 75) await OaEvent.create({ attemptId: attempt._id, assessmentId: assessment._id, kind: "INFO", type: "CONNECTION_GAP", detail: `No signal from the student's browser for ${gapSec}s` })
    const updated = await OaAttempt.findByIdAndUpdate(attempt._id, { $set }, { new: true })
    return stateOf(updated, assessment)
}

export const reportViolation = async (ctx, { type, detail, image } = {}) => {
    const { assessment, attempt } = await loadContext(ctx)
    if (!attempt) throw new ApiError(409, "NOT_STARTED", "You have not started this test.")
    if (attempt.status !== "IN_PROGRESS") return stateOf(attempt, assessment)
    const rule = VIOLATIONS[type]
    if (!rule) throw new ApiError(400, "VALIDATION_ERROR", "Unknown event.")

    // Switched-off checks are logged for the record but never count against the student.
    const counted = rule.counted && (!rule.needs || assessment.proctoring[rule.needs])
    const now = new Date()
    let fresh = attempt
    let recordedAsCounted = false
    if (counted) {
        const claimed = await OaAttempt.findOneAndUpdate(
            { _id: attempt._id, status: "IN_PROGRESS", $or: [{ "lastViolation.kind": { $ne: type } }, { "lastViolation.at": { $lt: new Date(now - DEDUPE_MS) } }, { lastViolation: { $exists: false } }] },
            { $inc: { violationCount: 1 }, $set: { lastViolation: { kind: type, at: now } } },
            { new: true },
        )
        if (claimed) { fresh = claimed; recordedAsCounted = true }
    }
    if (recordedAsCounted || !counted) {
        await OaEvent.create({ attemptId: attempt._id, assessmentId: assessment._id, kind: counted ? "VIOLATION" : "INFO", type, detail: String(detail || "").slice(0, 300), counted: recordedAsCounted, image: validImage(image), at: now })
    }
    if (recordedAsCounted) {
        const ended = await maybeTerminate(fresh, assessment, fresh.violationCount)
        if (ended) fresh = ended
    }
    return stateOf(fresh, assessment)
}

export const submit = async (ctx) => {
    const { assessment, attempt } = await loadContext(ctx)
    if (!attempt) throw new ApiError(409, "NOT_STARTED", "You have not started this test.")
    const done = await finalizeAttempt(attempt._id, { status: "SUBMITTED" })
    return { status: done.status, submittedAt: done.submittedAt, result: resultView(assessment, done) }
}

// ---------- running code (like the Run button on a coding site) ----------

const STARTER_ONLY = (question, code) => {
    const starters = [question.starterCode, ...Object.values(question.starterCodes || {})].map((c) => String(c || "").trim())
    return !String(code || "").trim() || starters.includes(String(code).trim())
}

/**
 * Run the candidate's code. With no `customInput` it runs the question's sample (non-hidden) test cases and says which
 * passed; with `customInput` it just runs the program on that input. Hidden test cases are never run or shown here.
 */
export const runCode = async (ctx, { questionId, language, code, customInput } = {}) => {
    const { assessment, attempt } = await loadContext(ctx)
    if (!attempt) throw new ApiError(409, "NOT_STARTED", "You have not started this test.")
    if (attempt.status !== "IN_PROGRESS") throw new ApiError(409, "ALREADY_FINISHED", "This test has already been submitted.")
    await settleIfExpired(attempt)
    const question = assessment.questions.find((q) => q.id === String(questionId))
    const inPaper = attempt.order.sections.some((sec) => sec.questionIds.includes(String(questionId)))
    if (!question || !inPaper || question.type !== "CODING") throw new ApiError(400, "VALIDATION_ERROR", "That question does not take code.")
    const q = asObject(question)
    if (!q.codeLanguages.includes(language)) throw new ApiError(400, "VALIDATION_ERROR", "That language is not allowed for this question.")
    if (typeof code !== "string" || code.length > 50000) throw new ApiError(400, "VALIDATION_ERROR", "The code is too long to run.")
    if (!canRunLanguage(language)) throw new ApiError(503, "CODE_RUNNER_NOT_CONFIGURED", runnableLanguages().length ? "This language cannot be run here. Your code is still saved." : "Running code is not set up on this server. Your code is saved and your organizer will review it.")
    rateLimit({ key: `oa-run:${attempt._id}`, max: 10, windowMs: 60 * 1000 })
    rateLimit({ key: `oa-run-all:${attempt._id}`, max: 120, windowMs: 3 * 3600 * 1000 })

    if (customInput !== undefined && customInput !== null) {
        if (typeof customInput !== "string" || customInput.length > 5000) throw new ApiError(400, "VALIDATION_ERROR", "The custom input can be at most 5000 characters.")
        const [r] = await runCases({ language, code, cases: [{ input: customInput, expected: null }] })
        return { custom: true, results: [{ ...r, input: customInput, expected: null, passed: null }], passed: null, total: 1 }
    }
    const visible = (q.testCases || []).filter((c) => !c.hidden).slice(0, 10)
    if (!visible.length) throw new ApiError(400, "NO_SAMPLE_CASES", "This question has no sample test cases to run. Use your own input to try the code.")
    const results = await runCases({ language, code, cases: visible })
    return { custom: false, results: results.map((r, i) => ({ ...r, input: visible[i].input, expected: visible[i].expected })), passed: results.filter((r) => r.passed).length, total: results.length }
}

/**
 * After a test is submitted: run every test case (hidden ones included) for each coding answer and score it by the
 * share that passed. The organizer can still change the marks by hand. Does nothing when no code runner is set up.
 */
export const autoGradeCoding = async (attemptId) => {
    if (!runnableLanguages().length) return
    const attempt = await OaAttempt.findById(attemptId)
    if (!attempt || attempt.status === "IN_PROGRESS") return
    const assessment = await OaAssessment.findById(attempt.assessmentId)
    if (!assessment) return
    const found = {}
    for (const question of assessment.questions) {
        const q = asObject(question)
        const cases = (q.testCases || []).slice(0, 20)
        const given = attempt.answers?.[q.id]?.value
        const existing = attempt.grades?.[q.id]
        if (q.type !== "CODING" || !cases.length || (existing && existing.auto === false && existing.marks !== null && existing.marks !== undefined)) continue
        if (!given || typeof given !== "object" || !canRunLanguage(given.language) || STARTER_ONLY(q, given.code)) { found[q.id] = { passed: 0, total: cases.length, ran: false }; continue }
        const results = await runCases({ language: given.language, code: String(given.code), cases })
        found[q.id] = { passed: results.filter((r) => r.passed).length, total: cases.length, ran: true }
    }
    if (!Object.keys(found).length) return
    // Read the attempt again: the organizer may have graded something while the cases were running.
    const fresh = await OaAttempt.findById(attemptId)
    const grades = { ...(fresh.grades || {}) }
    for (const [id, f] of Object.entries(found)) {
        const q = assessment.questions.find((x) => x.id === id)
        const held = grades[id]
        if (held && held.auto === false && held.marks !== null && held.marks !== undefined) continue
        grades[id] = { marks: Math.round((q.marks * f.passed / f.total) * 100) / 100, auto: true, needsReview: true, runner: { passed: f.passed, total: f.total, ran: f.ran, at: new Date() } }
    }
    const result = gradeAttempt({ questions: assessment.questions.map(asObject), answers: fresh.answers || {}, grades, settings: assessment.settings?.toObject?.() || {} })
    await OaAttempt.updateOne({ _id: attemptId }, { $set: { grades: result.grades, score: result.score, maxScore: result.maxScore, percent: result.percent, gradingStatus: result.gradingStatus } })
}
