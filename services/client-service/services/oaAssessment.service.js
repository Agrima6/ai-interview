import mongoose from "mongoose"
import { OaAccount, OaAssessment, OaAttempt, OaEvent, OaStudent } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import { csvEscape } from "../utils/csv.js"
import { EMAIL_RE, generateAccessCode, hashAccessCode, normalizeEmail } from "../utils/oaSecurity.js"
import { decryptSecret, encryptSecret } from "../utils/crypto.js"
import { newId, normalizeQuestion, normalizeQuestions } from "../utils/oaQuestions.js"
import { gradeAttempt, parseSchedule, rankRows, schedulePhase } from "../utils/oaExam.js"
import { inviteEmail, sendOaEmail } from "./oaMail.js"
import { generateQuestions } from "./oaAi.service.js"

const MAX_STUDENTS_PER_UPLOAD = 2000
const FINISHED = ["SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"]

const objectId = (id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "NOT_FOUND", "Not found.")
    return id
}

// Every lookup is scoped to the signed-in account: changing an id in the URL can never reach someone else's test.
const owned = async (accountId, id) => {
    const assessment = await OaAssessment.findOne({ _id: objectId(id), accountId })
    if (!assessment) throw new ApiError(404, "NOT_FOUND", "Assessment not found.")
    return assessment
}

const hasAttempts = (assessmentId) => OaAttempt.exists({ assessmentId })

const clampInt = (value, min, max, fallback) => {
    const n = Math.round(Number(value))
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

const pageParams = ({ page, pageSize }, fallback = 25) => ({
    page: Math.max(parseInt(page, 10) || 1, 1),
    pageSize: [10, 25, 50, 100].includes(parseInt(pageSize, 10)) ? parseInt(pageSize, 10) : fallback,
})

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const assessmentView = (a, extra = {}) => {
    const o = a.toObject ? a.toObject() : a
    return {
        id: String(o._id), title: o.title, description: o.description, instructions: o.instructions, status: o.status,
        roundLabel: o.roundLabel, previousAssessmentId: o.previousAssessmentId ? String(o.previousAssessmentId) : null,
        schedule: o.schedule, settings: o.settings, proctoring: o.proctoring,
        sections: o.sections, questions: o.questions,
        questionCount: o.questions?.length || 0,
        totalMarks: (o.questions || []).reduce((sum, q) => sum + q.marks, 0),
        phase: o.schedule?.startAt && o.schedule?.endAt ? schedulePhase(o.schedule) : "UNSCHEDULED",
        publishedAt: o.publishedAt, createdAt: o.createdAt, updatedAt: o.updatedAt,
        ...extra,
    }
}

// ---------- assessments ----------

export const listAssessments = async (accountId, { status, search, page, pageSize } = {}) => {
    const filter = { accountId }
    if (["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) filter.status = status
    else filter.status = { $ne: "ARCHIVED" }
    const term = String(search || "").trim().slice(0, 80)
    if (term) filter.title = new RegExp(escapeRegex(term), "i")
    const p = pageParams({ page, pageSize })
    const [items, total] = await Promise.all([
        OaAssessment.find(filter).select("-questions.options -questions.correct -questions.modelAnswer").sort({ createdAt: -1 }).skip((p.page - 1) * p.pageSize).limit(p.pageSize),
        OaAssessment.countDocuments(filter),
    ])
    const ids = items.map((a) => a._id)
    const [students, attempts] = await Promise.all([
        OaStudent.aggregate([{ $match: { assessmentId: { $in: ids } } }, { $group: { _id: "$assessmentId", n: { $sum: 1 } } }]),
        OaAttempt.aggregate([{ $match: { assessmentId: { $in: ids } } }, { $group: { _id: { a: "$assessmentId", done: { $in: ["$status", FINISHED] } }, n: { $sum: 1 } } }]),
    ])
    const studentCount = new Map(students.map((s) => [String(s._id), s.n]))
    const started = new Map(); const finished = new Map()
    for (const row of attempts) {
        const key = String(row._id.a)
        started.set(key, (started.get(key) || 0) + row.n)
        if (row._id.done) finished.set(key, (finished.get(key) || 0) + row.n)
    }
    return {
        items: items.map((a) => assessmentView(a, {
            questions: undefined,
            stats: { students: studentCount.get(String(a._id)) || 0, started: started.get(String(a._id)) || 0, finished: finished.get(String(a._id)) || 0 },
        })),
        total, ...p,
    }
}

export const dashboard = async (accountId) => {
    const [assessments, students, attempts] = await Promise.all([
        OaAssessment.find({ accountId, status: { $ne: "ARCHIVED" } }).select("title status schedule createdAt").lean(),
        OaStudent.countDocuments({ accountId }),
        OaAttempt.aggregate([{ $match: { accountId: new mongoose.Types.ObjectId(String(accountId)) } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    ])
    const phaseOf = (a) => (a.status === "PUBLISHED" && a.schedule?.startAt ? schedulePhase(a.schedule) : null)
    const byStatus = Object.fromEntries(attempts.map((a) => [a._id, a.n]))
    return {
        assessments: { total: assessments.length, draft: assessments.filter((a) => a.status === "DRAFT").length, upcoming: assessments.filter((a) => phaseOf(a) === "UPCOMING").length, live: assessments.filter((a) => ["OPEN", "CLOSED_TO_ENTRY"].includes(phaseOf(a))).length, ended: assessments.filter((a) => phaseOf(a) === "ENDED").length },
        students, attempts: { inProgress: byStatus.IN_PROGRESS || 0, finished: FINISHED.reduce((s, k) => s + (byStatus[k] || 0), 0) },
        next: assessments.filter((a) => phaseOf(a) === "UPCOMING").sort((a, b) => new Date(a.schedule.startAt) - new Date(b.schedule.startAt)).slice(0, 3).map((a) => ({ id: String(a._id), title: a.title, startAt: a.schedule.startAt })),
    }
}

const applySettings = (target, input = {}) => {
    const s = target.settings || {}
    const flag = (key, fallback) => (typeof input[key] === "boolean" ? input[key] : fallback)
    return {
        shuffleQuestions: flag("shuffleQuestions", s.shuffleQuestions ?? true),
        shuffleOptions: flag("shuffleOptions", s.shuffleOptions ?? true),
        shuffleSections: flag("shuffleSections", s.shuffleSections ?? false),
        allowBackNavigation: flag("allowBackNavigation", s.allowBackNavigation ?? true),
        showResultToStudent: flag("showResultToStudent", s.showResultToStudent ?? false),
        passPercent: input.passPercent === undefined ? (s.passPercent ?? 40) : clampInt(input.passPercent, 0, 100, 40),
    }
}

const applyProctoring = (target, input = {}) => {
    const p = target.proctoring || {}
    const flag = (key, fallback) => (typeof input[key] === "boolean" ? input[key] : fallback)
    const level = input.level === "STANDARD" ? "STANDARD" : input.level === "HARD" ? "HARD" : (p.level || "HARD")
    // HARD cannot be weakened flag by flag: the level is a promise to the students' institution.
    const hard = level === "HARD"
    return {
        level,
        requireCamera: hard ? true : flag("requireCamera", p.requireCamera ?? true),
        requireScreenShare: hard ? true : flag("requireScreenShare", p.requireScreenShare ?? true),
        requireFullscreen: hard ? true : flag("requireFullscreen", p.requireFullscreen ?? true),
        faceChecks: hard ? true : flag("faceChecks", p.faceChecks ?? true),
        blockCopyPaste: hard ? true : flag("blockCopyPaste", p.blockCopyPaste ?? true),
        maxViolations: input.maxViolations === undefined ? (p.maxViolations ?? 5) : clampInt(input.maxViolations, 1, 50, 5),
        snapshotIntervalSec: input.snapshotIntervalSec === undefined ? (p.snapshotIntervalSec ?? 45) : clampInt(input.snapshotIntervalSec, 15, 300, 45),
    }
}

const cleanText = (value, max) => String(value ?? "").trim().slice(0, max)

export const createAssessment = async (accountId, input = {}) => {
    const title = cleanText(input.title, 140)
    if (title.length < 3) throw new ApiError(400, "VALIDATION_ERROR", "Give the test a name (at least 3 characters).", { title: "Required." })
    const assessment = new OaAssessment({
        accountId, title,
        description: cleanText(input.description, 2000), instructions: cleanText(input.instructions, 4000), roundLabel: cleanText(input.roundLabel, 60),
        sections: [{ id: newId(), title: "Section 1" }],
    })
    assessment.settings = applySettings(assessment, input.settings)
    assessment.proctoring = applyProctoring(assessment, input.proctoring)
    if (input.schedule) assessment.schedule = scheduleFrom(assessment, input.schedule)
    await assessment.save()
    return assessmentView(assessment)
}

const scheduleFrom = (assessment, input) => {
    const merged = { ...(assessment.schedule?.toObject?.() || assessment.schedule || {}), ...input }
    const parsed = parseSchedule(merged)
    if (parsed.error) throw new ApiError(400, "VALIDATION_ERROR", parsed.error, { [parsed.field]: parsed.error })
    return parsed
}

// `locked`: someone has started, so questions, sections, rules and schedule can no longer change.
export const getAssessment = async (accountId, id) => {
    const assessment = await owned(accountId, id)
    return assessmentView(assessment, { locked: Boolean(await hasAttempts(assessment._id)) })
}

export const updateAssessment = async (accountId, id, patch = {}) => {
    const assessment = await owned(accountId, id)
    const started = await hasAttempts(assessment._id)
    if (assessment.status === "ARCHIVED") throw new ApiError(409, "ARCHIVED", "This test is archived.")

    if (patch.title !== undefined) {
        const title = cleanText(patch.title, 140)
        if (title.length < 3) throw new ApiError(400, "VALIDATION_ERROR", "Give the test a name (at least 3 characters).", { title: "Required." })
        assessment.title = title
    }
    if (patch.description !== undefined) assessment.description = cleanText(patch.description, 2000)
    if (patch.instructions !== undefined) assessment.instructions = cleanText(patch.instructions, 4000)
    if (patch.roundLabel !== undefined) assessment.roundLabel = cleanText(patch.roundLabel, 60)

    const structural = patch.sections !== undefined || patch.settings !== undefined || patch.proctoring !== undefined || patch.schedule !== undefined
    if (started && structural) {
        throw new ApiError(409, "TEST_STARTED", "Students have already started this test, so its sections, rules and schedule are locked.")
    }
    if (patch.schedule !== undefined) assessment.schedule = scheduleFrom(assessment, patch.schedule)
    if (patch.settings !== undefined) assessment.settings = applySettings(assessment, patch.settings)
    if (patch.proctoring !== undefined) assessment.proctoring = applyProctoring(assessment, patch.proctoring)

    if (patch.sections !== undefined) {
        const next = (Array.isArray(patch.sections) ? patch.sections : []).slice(0, 12).map((s) => ({ id: cleanText(s.id, 80) || newId(), title: cleanText(s.title, 80) || "Untitled section" }))
        if (!next.length) throw new ApiError(400, "VALIDATION_ERROR", "A test needs at least one section.")
        const keep = new Set(next.map((s) => s.id))
        const orphaned = assessment.questions.filter((q) => !keep.has(q.sectionId)).length
        if (orphaned) throw new ApiError(409, "SECTION_NOT_EMPTY", `Move or delete the ${orphaned} question(s) in the removed section first.`)
        assessment.sections = next
    }
    await assessment.save()
    return assessmentView(assessment, { locked: started })
}

export const publish = async (accountId, id) => {
    const assessment = await owned(accountId, id)
    if (assessment.status === "PUBLISHED") return assessmentView(assessment)
    const problems = []
    if (!assessment.questions.length) problems.push("Add at least one question.")
    if (!assessment.schedule?.startAt || !assessment.schedule?.endAt) problems.push("Set the date, start time, closing time and duration.")
    else {
        const parsed = parseSchedule(assessment.schedule.toObject())
        if (parsed.error) problems.push(parsed.error)
    }
    if (problems.length) throw new ApiError(400, "NOT_READY", problems[0], { checklist: problems })
    assessment.status = "PUBLISHED"
    assessment.publishedAt = new Date()
    await assessment.save()
    return assessmentView(assessment)
}

export const unpublish = async (accountId, id) => {
    const assessment = await owned(accountId, id)
    if (await hasAttempts(assessment._id)) throw new ApiError(409, "TEST_STARTED", "Students have already started this test, so it cannot go back to draft.")
    assessment.status = "DRAFT"
    await assessment.save()
    return assessmentView(assessment)
}

export const archive = async (accountId, id) => {
    const assessment = await owned(accountId, id)
    assessment.status = "ARCHIVED"
    await assessment.save()
    return assessmentView(assessment)
}

// ---------- questions ----------

const assertEditable = async (assessment) => {
    if (await hasAttempts(assessment._id)) throw new ApiError(409, "TEST_STARTED", "Students have already started this test, so its questions are locked.")
}

const sectionContext = (assessment, requested) => {
    const sectionIds = assessment.sections.map((s) => s.id)
    const defaultSectionId = sectionIds.includes(requested) ? requested : sectionIds[0]
    return { sectionIds, defaultSectionId }
}

export const addQuestions = async (accountId, id, { questions, source = "MANUAL", sectionId } = {}) => {
    const assessment = await owned(accountId, id)
    await assertEditable(assessment)
    if (assessment.questions.length >= 300) throw new ApiError(409, "LIMIT", "A test can hold up to 300 questions.")
    const list = Array.isArray(questions) ? questions.slice(0, 300) : []
    if (!list.length) throw new ApiError(400, "VALIDATION_ERROR", "No questions were sent.")
    const ctx = sectionContext(assessment, sectionId)
    const { accepted, rejected } = normalizeQuestions(list, { ...ctx, source })
    // Uploading a file with some bad rows must not silently drop them, and must not half-apply either way: only
    // accept when every row is good, or the admin explicitly chose to skip the bad ones.
    if (rejected.length && accepted.length === 0) throw new ApiError(400, "VALIDATION_ERROR", rejected[0].error, { rows: rejected })
    const room = 300 - assessment.questions.length
    const toAdd = accepted.slice(0, room)
    assessment.questions.push(...toAdd)
    await assessment.save()
    return { added: toAdd.length, rejected, total: assessment.questions.length }
}

export const updateQuestion = async (accountId, id, questionId, patch) => {
    const assessment = await owned(accountId, id)
    await assertEditable(assessment)
    const index = assessment.questions.findIndex((q) => q.id === questionId)
    if (index < 0) throw new ApiError(404, "NOT_FOUND", "Question not found.")
    const existing = assessment.questions[index].toObject()
    const ctx = sectionContext(assessment, patch?.sectionId || existing.sectionId)
    assessment.questions[index] = normalizeQuestion({ ...existing, ...patch, id: existing.id }, { ...ctx, source: existing.source })
    await assessment.save()
    return assessment.questions[index]
}

export const deleteQuestion = async (accountId, id, questionId) => {
    const assessment = await owned(accountId, id)
    await assertEditable(assessment)
    const before = assessment.questions.length
    assessment.questions = assessment.questions.filter((q) => q.id !== questionId)
    if (assessment.questions.length === before) throw new ApiError(404, "NOT_FOUND", "Question not found.")
    await assessment.save()
    return { total: assessment.questions.length }
}

export const aiDraft = async (accountId, id, input = {}) => {
    const assessment = await owned(accountId, id)
    const ctx = sectionContext(assessment, input.sectionId)
    return generateQuestions({ prompt: input.prompt, count: input.count, types: input.types, difficulty: input.difficulty, sectionId: ctx.defaultSectionId, sectionIds: ctx.sectionIds })
}

// ---------- students ----------

const studentView = (s, attempt) => ({
    id: String(s._id), name: s.name, email: s.email, phone: s.phone, rollNumber: s.rollNumber,
    details: s.details ? Object.fromEntries(s.details) : {},
    accessCode: (() => { try { return decryptSecret(s.codeEncrypted) } catch { return null } })(),
    invite: s.invite,
    attempt: attempt ? { id: String(attempt._id), status: attempt.status, percent: attempt.percent, violationCount: attempt.violationCount } : null,
})

export const addStudents = async (accountId, id, { students } = {}) => {
    const assessment = await owned(accountId, id)
    const rows = (Array.isArray(students) ? students : []).slice(0, MAX_STUDENTS_PER_UPLOAD)
    if (!rows.length) throw new ApiError(400, "VALIDATION_ERROR", "No students were sent.")
    if ((Array.isArray(students) ? students.length : 0) > MAX_STUDENTS_PER_UPLOAD) throw new ApiError(400, "LIMIT", `Upload at most ${MAX_STUDENTS_PER_UPLOAD} students at a time.`)

    const existing = new Set((await OaStudent.find({ assessmentId: assessment._id }).select("emailNormalized").lean()).map((s) => s.emailNormalized))
    const seen = new Set(); const docs = []; const skipped = []
    rows.forEach((row, index) => {
        const name = cleanText(row?.name, 100)
        const email = cleanText(row?.email, 200)
        const reason = !name ? "Name is missing" : !EMAIL_RE.test(email) ? "Email is not valid" : null
        const key = normalizeEmail(email)
        if (reason) return skipped.push({ row: index + 1, email, reason })
        if (existing.has(key) || seen.has(key)) return skipped.push({ row: index + 1, email, reason: "Already on this test" })
        seen.add(key)
        const phone = cleanText(row?.phone, 20)
        const details = {}
        for (const [k, v] of Object.entries(row?.details || {}).slice(0, 10)) if (String(v ?? "").trim()) details[cleanText(k, 40).replace(/[.$]/g, "_")] = cleanText(v, 100)
        const code = generateAccessCode()
        docs.push({
            accountId, assessmentId: assessment._id, name, email, emailNormalized: key,
            phone: /^[0-9+()\-\s]{7,20}$/.test(phone) ? phone : null, rollNumber: cleanText(row?.rollNumber, 40),
            details, codeHash: hashAccessCode(code), codeEncrypted: encryptSecret(code),
        })
    })
    if (docs.length) await OaStudent.insertMany(docs, { ordered: false })
    return { added: docs.length, skipped }
}

export const listStudents = async (accountId, id, { search, status, page, pageSize } = {}) => {
    const assessment = await owned(accountId, id)
    const filter = { assessmentId: assessment._id }
    const term = String(search || "").trim().slice(0, 80)
    if (term) { const rx = new RegExp(escapeRegex(term), "i"); filter.$or = [{ name: rx }, { email: rx }, { rollNumber: rx }] }
    if (["NOT_SENT", "SENT", "FAILED"].includes(status)) filter["invite.status"] = status
    const p = pageParams({ page, pageSize })
    const [items, total, attempts] = await Promise.all([
        OaStudent.find(filter).sort({ createdAt: 1 }).skip((p.page - 1) * p.pageSize).limit(p.pageSize),
        OaStudent.countDocuments(filter),
        OaAttempt.find({ assessmentId: assessment._id }).select("studentId status percent violationCount").lean(),
    ])
    const byStudent = new Map(attempts.map((a) => [String(a.studentId), a]))
    return { items: items.map((s) => studentView(s, byStudent.get(String(s._id)))), total, ...p }
}

export const removeStudent = async (accountId, id, studentId) => {
    const assessment = await owned(accountId, id)
    if (await OaAttempt.exists({ assessmentId: assessment._id, studentId: objectId(studentId) })) throw new ApiError(409, "TEST_STARTED", "This student has already started the test, so they cannot be removed.")
    const res = await OaStudent.deleteOne({ _id: studentId, assessmentId: assessment._id })
    if (!res.deletedCount) throw new ApiError(404, "NOT_FOUND", "Student not found.")
    return { removed: true }
}

export const sendInvites = async (accountId, id, { studentIds, resend = false } = {}) => {
    const assessment = await owned(accountId, id)
    if (assessment.status !== "PUBLISHED") throw new ApiError(409, "NOT_PUBLISHED", "Publish the test before inviting students.")
    if (schedulePhase(assessment.schedule) === "ENDED") throw new ApiError(409, "ENDED", "This test has already closed.")
    const account = await OaAccount.findById(accountId)
    const filter = { assessmentId: assessment._id }
    if (Array.isArray(studentIds) && studentIds.length) filter._id = { $in: studentIds.filter((x) => mongoose.isValidObjectId(x)) }
    // Idempotent: a repeated click only mails people who have not been mailed (unless the admin asks to resend).
    if (!resend) filter["invite.status"] = { $ne: "SENT" }
    const students = await OaStudent.find(filter).limit(MAX_STUDENTS_PER_UPLOAD)

    let sent = 0; const failed = []
    const queue = [...students]
    const worker = async () => {
        while (queue.length) {
            const student = queue.shift()
            const code = decryptSecret(student.codeEncrypted)
            const mail = inviteEmail({ assessment, student, code, orgName: account?.orgName || "Your organizer" })
            const result = await sendOaEmail({ accountId, to: student.email, eventType: "OA_INVITE", ...mail, metadata: { assessmentId: String(assessment._id), studentId: String(student._id) } })
            student.invite = result.ok ? { status: "SENT", sentAt: new Date(), error: null } : { status: "FAILED", sentAt: student.invite?.sentAt || null, error: String(result.error || "send failed").slice(0, 120) }
            await student.save()
            if (result.ok) sent += 1; else failed.push({ email: student.email, reason: student.invite.error })
        }
    }
    await Promise.all(Array.from({ length: Math.min(5, students.length) }, worker))
    return { attempted: students.length, sent, failed }
}

// ---------- results ----------

const attemptStatusOf = (attempt) => (attempt ? attempt.status : "NOT_STARTED")
const isRankable = (a) => Boolean(a) && ((["SUBMITTED", "AUTO_SUBMITTED"].includes(a.status) && a.adminDecision !== "DISQUALIFIED") || (a.status === "TERMINATED" && a.adminDecision === "CLEARED"))
const durationSec = (a) => (a.submittedAt ? Math.max(0, Math.round((new Date(a.submittedAt) - new Date(a.startedAt)) / 1000)) : null)

const buildResultRows = async (assessment) => {
    const [students, attempts] = await Promise.all([
        OaStudent.find({ assessmentId: assessment._id }).lean(),
        OaAttempt.find({ assessmentId: assessment._id }).select("-answers -grades -order -environment").lean(),
    ])
    const byStudent = new Map(attempts.map((a) => [String(a.studentId), a]))
    const ranks = rankRows(attempts.map((a) => ({ id: String(a._id), percent: a.percent, durationSec: durationSec(a), eligible: isRankable(a) })))
    const pass = assessment.settings?.passPercent ?? 40
    return students.map((s) => {
        const a = byStudent.get(String(s._id))
        const finished = a && FINISHED.includes(a.status)
        return {
            attemptId: a ? String(a._id) : null, studentId: String(s._id),
            name: s.name, email: s.email, rollNumber: s.rollNumber, details: s.details || {},
            status: attemptStatusOf(a),
            score: a ? a.score : null, maxScore: a ? a.maxScore : null, percent: finished ? a.percent : null,
            rank: a ? ranks.get(String(a._id)) ?? null : null,
            passed: finished && isRankable(a) ? a.percent >= pass : null,
            gradingStatus: a?.gradingStatus || null,
            violationCount: a?.violationCount || 0,
            adminDecision: a?.adminDecision || null,
            timeTakenSec: a ? durationSec(a) : null,
            submittedAt: a?.submittedAt || null,
            endReason: a?.endReason || null,
        }
    })
}

const filterRows = (rows, q) => {
    let list = rows
    const term = String(q.search || "").trim().toLowerCase()
    if (term) list = list.filter((r) => [r.name, r.email, r.rollNumber].some((v) => String(v || "").toLowerCase().includes(term)))
    if (q.status) list = list.filter((r) => r.status === q.status)
    if (q.result === "PASSED") list = list.filter((r) => r.passed === true)
    if (q.result === "FAILED") list = list.filter((r) => r.passed === false)
    if (q.flagged === "true" || q.flagged === true) list = list.filter((r) => r.violationCount > 0)
    const min = Number(q.minPercent)
    if (q.minPercent !== undefined && q.minPercent !== "" && Number.isFinite(min)) list = list.filter((r) => (r.percent ?? -1) >= min)
    const dir = q.order === "desc" ? -1 : 1
    const key = ["name", "percent", "violationCount", "rank"].includes(q.sortBy) ? q.sortBy : "rank"
    const cmp = (a, b) => {
        const av = a[key]; const bv = b[key]
        if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1   // blanks always last
        if (bv === null || bv === undefined) return -1
        return (typeof av === "string" ? av.localeCompare(bv) : av - bv) * dir
    }
    return [...list].sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name))
}

export const results = async (accountId, id, query = {}) => {
    const assessment = await owned(accountId, id)
    const all = await buildResultRows(assessment)
    const finished = all.filter((r) => FINISHED.includes(r.status))
    const scored = finished.filter((r) => r.percent !== null)
    const rows = filterRows(all, query)
    const p = pageParams(query)
    return {
        items: rows.slice((p.page - 1) * p.pageSize, p.page * p.pageSize), total: rows.length, ...p,
        summary: {
            invited: all.length, notStarted: all.filter((r) => r.status === "NOT_STARTED").length,
            inProgress: all.filter((r) => r.status === "IN_PROGRESS").length, finished: finished.length,
            terminated: all.filter((r) => r.status === "TERMINATED").length,
            passed: all.filter((r) => r.passed === true).length,
            average: scored.length ? Math.round((scored.reduce((s, r) => s + r.percent, 0) / scored.length) * 100) / 100 : null,
            highest: scored.length ? Math.max(...scored.map((r) => r.percent)) : null,
            pendingReview: all.filter((r) => r.gradingStatus === "PENDING_REVIEW").length,
            passPercent: assessment.settings?.passPercent ?? 40,
        },
    }
}

const label = (value) => String(value || "").toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

// Same filters as the results table, no paging: what you see filtered is what you download.
export const exportResultsCsv = async (accountId, id, query = {}) => {
    const assessment = await owned(accountId, id)
    const rows = filterRows(await buildResultRows(assessment), query)
    const head = ["Rank", "Name", "Email", "Roll number", "Status", "Score", "Out of", "Percent", "Result", "Violations", "Time taken (min)", "Submitted at", "Decision"]
    const lines = [head.map(csvEscape).join(",")]
    for (const r of rows) {
        lines.push([
            r.rank ?? "", r.name, r.email, r.rollNumber, label(r.status), r.score ?? "", r.maxScore ?? "", r.percent ?? "",
            r.passed === null ? "" : r.passed ? "Passed" : "Not passed", r.violationCount,
            r.timeTakenSec === null ? "" : Math.round(r.timeTakenSec / 6) / 10, r.submittedAt ? new Date(r.submittedAt).toISOString() : "", label(r.adminDecision),
        ].map(csvEscape).join(","))
    }
    return { filename: `${assessment.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "results"}-results.csv`, csv: lines.join("\r\n") }
}

export const attemptDetail = async (accountId, id, attemptId) => {
    const assessment = await owned(accountId, id)
    const attempt = await OaAttempt.findOne({ _id: objectId(attemptId), assessmentId: assessment._id }).lean()
    if (!attempt) throw new ApiError(404, "NOT_FOUND", "Attempt not found.")
    const [student, events] = await Promise.all([
        OaStudent.findById(attempt.studentId).lean(),
        OaEvent.find({ attemptId: attempt._id }).sort({ at: 1 }).limit(400).lean(),
    ])
    const byId = new Map(assessment.questions.map((q) => [q.id, q.toObject ? q.toObject() : q]))
    const sections = attempt.order.sections.map((s) => ({
        sectionId: s.sectionId, title: assessment.sections.find((x) => x.id === s.sectionId)?.title || "Section",
        questions: s.questionIds.map((qid) => {
            const q = byId.get(qid); if (!q) return null
            const answer = attempt.answers?.[qid]?.value
            const optionText = (ids) => (Array.isArray(ids) ? ids : []).map((oid) => q.options.find((o) => o.id === oid)?.text).filter(Boolean)
            return {
                id: q.id, type: q.type, text: q.text, marks: q.marks, negativeMarks: q.negativeMarks,
                options: q.options, correct: q.correct, correctText: optionText(q.correct), modelAnswer: q.modelAnswer, keywords: q.keywords, explanation: q.explanation,
                answer: q.options?.length ? { selected: Array.isArray(answer) ? answer : [], selectedText: optionText(answer) } : answer ?? null,
                answered: answer !== undefined && answer !== null && !(Array.isArray(answer) && !answer.length) && answer !== "",
                grade: attempt.grades?.[qid] || null,
            }
        }).filter(Boolean),
    }))
    return {
        attempt: {
            id: String(attempt._id), status: attempt.status, startedAt: attempt.startedAt, submittedAt: attempt.submittedAt, endReason: attempt.endReason,
            score: attempt.score, maxScore: attempt.maxScore, percent: attempt.percent, gradingStatus: attempt.gradingStatus,
            violationCount: attempt.violationCount, adminDecision: attempt.adminDecision, environment: attempt.environment, ip: attempt.ip,
        },
        student: student ? { name: student.name, email: student.email, rollNumber: student.rollNumber, details: student.details || {} } : null,
        passPercent: assessment.settings?.passPercent ?? 40,
        sections,
        violations: events.filter((e) => e.kind !== "SNAPSHOT").map((e) => ({ id: String(e._id), kind: e.kind, type: e.type, detail: e.detail, counted: e.counted, at: e.at, image: e.image })),
        snapshots: events.filter((e) => e.kind === "SNAPSHOT").slice(-60).map((e) => ({ id: String(e._id), at: e.at, image: e.image })),
    }
}

export const gradeManually = async (accountId, id, attemptId, { grades } = {}) => {
    const assessment = await owned(accountId, id)
    const attempt = await OaAttempt.findOne({ _id: objectId(attemptId), assessmentId: assessment._id })
    if (!attempt) throw new ApiError(404, "NOT_FOUND", "Attempt not found.")
    if (attempt.status === "IN_PROGRESS") throw new ApiError(409, "IN_PROGRESS", "Wait until the student has finished.")
    const byId = new Map(assessment.questions.map((q) => [q.id, q]))
    const next = { ...(attempt.grades || {}) }
    for (const g of Array.isArray(grades) ? grades : []) {
        const q = byId.get(g?.questionId)
        if (!q) throw new ApiError(400, "VALIDATION_ERROR", "A grade refers to a question that is not on this test.")
        const marks = Number(g.marks)
        if (!Number.isFinite(marks) || marks < 0 || marks > q.marks) throw new ApiError(400, "VALIDATION_ERROR", `Marks for a question must be between 0 and ${q.marks}.`, { [q.id]: `0 to ${q.marks}` })
        next[q.id] = { marks: Math.round(marks * 100) / 100, auto: false, needsReview: false, feedback: cleanText(g.feedback, 500) || undefined, gradedAt: new Date() }
    }
    const result = gradeAttempt({ questions: assessment.questions.map((q) => (q.toObject ? q.toObject() : q)), answers: attempt.answers, grades: next })
    Object.assign(attempt, { grades: result.grades, score: result.score, maxScore: result.maxScore, percent: result.percent, gradingStatus: result.gradingStatus })
    attempt.markModified("grades")
    await attempt.save()
    return { score: result.score, maxScore: result.maxScore, percent: result.percent, gradingStatus: result.gradingStatus }
}

export const setDecision = async (accountId, id, attemptId, decision) => {
    const assessment = await owned(accountId, id)
    if (![null, "CLEARED", "DISQUALIFIED"].includes(decision)) throw new ApiError(400, "VALIDATION_ERROR", "Unknown decision.")
    const attempt = await OaAttempt.findOneAndUpdate({ _id: objectId(attemptId), assessmentId: assessment._id, status: { $in: FINISHED } }, { adminDecision: decision }, { new: true })
    if (!attempt) throw new ApiError(404, "NOT_FOUND", "Attempt not found or still in progress.")
    return { adminDecision: attempt.adminDecision }
}

// ---------- live monitor ----------

export const live = async (accountId, id) => {
    const assessment = await owned(accountId, id)
    const [students, attempts] = await Promise.all([
        OaStudent.find({ assessmentId: assessment._id }).select("name email rollNumber").lean(),
        OaAttempt.find({ assessmentId: assessment._id }).select("studentId status violationCount lastHeartbeatAt startedAt deadline").lean(),
    ])
    const byStudent = new Map(attempts.map((a) => [String(a.studentId), a]))
    const now = Date.now()
    const rows = students.map((s) => {
        const a = byStudent.get(String(s._id))
        const silentFor = a?.status === "IN_PROGRESS" && a.lastHeartbeatAt ? Math.round((now - new Date(a.lastHeartbeatAt)) / 1000) : null
        return {
            studentId: String(s._id), attemptId: a ? String(a._id) : null, name: s.name, email: s.email, rollNumber: s.rollNumber,
            status: attemptStatusOf(a), violationCount: a?.violationCount || 0, deadline: a?.deadline || null,
            silentForSec: silentFor, offline: silentFor !== null && silentFor > 60,
        }
    })
    const count = (status) => rows.filter((r) => r.status === status).length
    return {
        phase: assessment.schedule?.startAt ? schedulePhase(assessment.schedule) : "UNSCHEDULED",
        counts: { total: rows.length, notStarted: count("NOT_STARTED"), inProgress: count("IN_PROGRESS"), submitted: count("SUBMITTED") + count("AUTO_SUBMITTED"), terminated: count("TERMINATED"), offline: rows.filter((r) => r.offline).length },
        items: rows.sort((a, b) => b.violationCount - a.violationCount || a.name.localeCompare(b.name)),
        serverNow: new Date(),
    }
}

// ---------- next round ----------

export const createNextRound = async (accountId, id, { title, minPercent, topN, roundLabel } = {}) => {
    const source = await owned(accountId, id)
    const rows = await buildResultRows(source)
    let qualified = rows.filter((r) => r.rank !== null)
    if (minPercent !== undefined && minPercent !== "") qualified = qualified.filter((r) => r.percent >= Number(minPercent))
    if (topN) qualified = qualified.filter((r) => r.rank <= Number(topN)) // ties at the cut-off all advance
    if (!qualified.length) throw new ApiError(409, "NO_ONE_QUALIFIES", "No one meets that cut-off yet. Check the results and the cut-off.")

    const next = new OaAssessment({
        accountId, title: cleanText(title, 140) || `${source.title} - next round`, roundLabel: cleanText(roundLabel, 60) || "Next round",
        description: source.description, instructions: source.instructions, previousAssessmentId: source._id,
        settings: source.settings.toObject(), proctoring: source.proctoring.toObject(), sections: [{ id: newId(), title: "Section 1" }],
    })
    await next.save()
    const people = await OaStudent.find({ _id: { $in: qualified.map((r) => r.studentId) } }).lean()
    const docs = people.map((s) => {
        const code = generateAccessCode()
        return { accountId, assessmentId: next._id, name: s.name, email: s.email, emailNormalized: s.emailNormalized, phone: s.phone, rollNumber: s.rollNumber, details: s.details, codeHash: hashAccessCode(code), codeEncrypted: encryptSecret(code) }
    })
    await OaStudent.insertMany(docs, { ordered: false })
    return { assessmentId: String(next._id), students: docs.length }
}
