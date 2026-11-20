import mongoose from "mongoose"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { OaAccount, OaAssessment, OaAttempt, OaEvent, OaStudent } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import { csvEscape } from "../utils/csv.js"
import { EMAIL_RE, generateAccessCode, hashAccessCode, normalizeEmail, rateLimit } from "../utils/oaSecurity.js"
import { decryptSecret, encryptSecret } from "../utils/crypto.js"
import { newId, normalizeQuestion, normalizeQuestions, sectionName } from "../utils/oaQuestions.js"
import { signedVideoPath } from "../utils/oaVideo.js"
import { gradeAttempt, parseSchedule, rankRows, schedulePhase } from "../utils/oaExam.js"
import { LIMITS, intInRange, nameProblem, normalizePhone, phoneProblem, textLength, throwFields } from "../utils/oaValidate.js"
import { inviteEmail, sendOaEmail } from "./oaMail.js"
import { brandForAssessmentId, emailBrand } from "./oaBrand.service.js"
import { generateQuestions } from "./oaAi.service.js"
import crypto from "node:crypto"

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
        driveId: o.driveId ? String(o.driveId) : null, roundNumber: o.roundNumber || 1, kind: o.kind || "TEST", aiInterviewDriveId: o.aiInterviewDriveId || null,
        aiPart: { enabled: Boolean(o.aiPart?.enabled), aiInterviewDriveId: o.aiPart?.aiInterviewDriveId || null, roundNumber: o.aiPart?.roundNumber || 1, when: o.aiPart?.when === "AFTER_REVIEW" ? "AFTER_REVIEW" : "AFTER_SUBMIT" },
        registration: { enabled: Boolean(o.registration?.enabled), token: o.registration?.token || null, closesAt: o.registration?.closesAt || null, maxRegistrations: o.registration?.maxRegistrations ?? null },
        schedule: o.schedule, settings: o.settings, proctoring: o.proctoring,
        sections: (o.sections || []).map((s) => ({ id: s.id, title: sectionName(s.title) })), questions: o.questions,
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
    const [students, attempts, waiting] = await Promise.all([
        OaStudent.aggregate([{ $match: { assessmentId: { $in: ids }, "approval.status": { $nin: ["PENDING", "REJECTED"] } } }, { $group: { _id: "$assessmentId", n: { $sum: 1 } } }]),
        OaAttempt.aggregate([{ $match: { assessmentId: { $in: ids } } }, { $group: { _id: { a: "$assessmentId", done: { $in: ["$status", FINISHED] } }, n: { $sum: 1 } } }]),
        OaStudent.aggregate([{ $match: { assessmentId: { $in: ids }, "approval.status": "PENDING" } }, { $group: { _id: "$assessmentId", n: { $sum: 1 } } }]),
    ])
    const pendingCount = new Map(waiting.map((s) => [String(s._id), s.n]))
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
            stats: { students: studentCount.get(String(a._id)) || 0, pending: pendingCount.get(String(a._id)) || 0, started: started.get(String(a._id)) || 0, finished: finished.get(String(a._id)) || 0 },
        })),
        total, ...p,
    }
}

export const dashboard = async (accountId) => {
    const [assessments, students, attempts, waiting] = await Promise.all([
        OaAssessment.find({ accountId, status: { $ne: "ARCHIVED" } }).select("title status schedule createdAt driveId roundNumber").lean(),
        OaStudent.countDocuments({ accountId, "approval.status": { $nin: ["PENDING", "REJECTED"] } }),
        OaAttempt.aggregate([{ $match: { accountId: new mongoose.Types.ObjectId(String(accountId)) } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
        OaStudent.aggregate([{ $match: { accountId: new mongoose.Types.ObjectId(String(accountId)), "approval.status": "PENDING" } }, { $group: { _id: "$assessmentId", n: { $sum: 1 } } }]),
    ])
    const titleOf = new Map(assessments.map((a) => [String(a._id), a]))
    const pendingRounds = waiting.map((w) => ({ w, a: titleOf.get(String(w._id)) })).filter((x) => x.a).sort((x, y) => y.w.n - x.w.n).slice(0, 5)
        .map(({ w, a }) => ({ id: String(a._id), driveId: a.driveId ? String(a.driveId) : null, title: a.title, roundNumber: a.roundNumber || 1, count: w.n }))
    const phaseOf = (a) => (a.status === "PUBLISHED" && a.schedule?.startAt ? schedulePhase(a.schedule) : null)
    const byStatus = Object.fromEntries(attempts.map((a) => [a._id, a.n]))
    return {
        assessments: { total: assessments.length, draft: assessments.filter((a) => a.status === "DRAFT").length, upcoming: assessments.filter((a) => phaseOf(a) === "UPCOMING").length, live: assessments.filter((a) => ["OPEN", "CLOSED_TO_ENTRY"].includes(phaseOf(a))).length, ended: assessments.filter((a) => phaseOf(a) === "ENDED").length },
        students, pending: { total: waiting.reduce((s, w) => s + (titleOf.has(String(w._id)) ? w.n : 0), 0), rounds: pendingRounds }, attempts: { inProgress: byStatus.IN_PROGRESS || 0, finished: FINISHED.reduce((s, k) => s + (byStatus[k] || 0), 0) },
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
        partialMarking: flag("partialMarking", s.partialMarking ?? false),
        aiMarking: flag("aiMarking", s.aiMarking ?? false),
        passPercent: input.passPercent === undefined ? (s.passPercent ?? 40) : intInRange(input.passPercent, { ...LIMITS.passPercent, field: "passPercent", label: "Pass mark" }),
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
        // Not tied to the level: some candidates' devices cannot give a location, so the organizer may switch it off.
        requireLocation: flag("requireLocation", p.requireLocation ?? false),
        maxViolations: input.maxViolations === undefined ? Math.min(p.maxViolations ?? 5, LIMITS.maxViolations.max) : intInRange(input.maxViolations, { ...LIMITS.maxViolations, field: "maxViolations", label: "Violations before auto-submit" }),
        snapshotIntervalSec: input.snapshotIntervalSec === undefined ? (p.snapshotIntervalSec ?? 45) : intInRange(input.snapshotIntervalSec, { ...LIMITS.snapshotIntervalSec, field: "snapshotIntervalSec", label: "Snapshot interval" }),
    }
}

const cleanText = (value, max) => String(value ?? "").trim().slice(0, max)

// Over-long text is refused with a message, not silently cut: the organizer should see what was too long.
const checkedTitle = (value) => {
    const title = textLength(value, { max: LIMITS.title.max, field: "title", label: "The name" })
    if (title.length < LIMITS.title.min) throw new ApiError(400, "VALIDATION_ERROR", `Give the test a name (at least ${LIMITS.title.min} characters).`, { title: `At least ${LIMITS.title.min} characters.` })
    return title
}
const checkedText = (value, key, label) => textLength(value, { max: LIMITS[key].max, field: key, label })

export const createAssessment = async (accountId, input = {}) => {
    const title = checkedTitle(input.title)
    const assessment = new OaAssessment({
        accountId, title,
        description: checkedText(input.description, "description", "Description"), instructions: checkedText(input.instructions, "instructions", "Instructions"), roundLabel: checkedText(input.roundLabel, "roundLabel", "Round label"),
        sections: [{ id: newId(), title: "" }],
    })
    if (input.driveId) Object.assign(assessment, { driveId: input.driveId, roundNumber: input.roundNumber || 1 })
    // New rounds let AI suggest marks for written and coding answers (it only runs when an AI key is set); it can be switched off.
    assessment.settings = applySettings(assessment, { aiMarking: true, ...(input.settings || {}) })
    // New rounds ask for the candidate's location; rounds made before this existed keep working as they were.
    assessment.proctoring = applyProctoring(assessment, { requireLocation: true, ...(input.proctoring || {}) })
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

// How many students booked each slot: { [slotId]: count }.
const slotUsage = async (assessment) => {
    if (assessment.schedule?.mode !== "SLOTS") return {}
    const rows = await OaStudent.aggregate([{ $match: { assessmentId: assessment._id, slotId: { $ne: null } } }, { $group: { _id: "$slotId", n: { $sum: 1 } } }])
    return Object.fromEntries(rows.map((r) => [r._id, r.n]))
}

// `locked`: someone has started, so questions, sections, rules and schedule can no longer change.
export const getAssessment = async (accountId, id) => {
    const assessment = await owned(accountId, id)
    const [students, started, finished, pending] = await Promise.all([
        OaStudent.countDocuments({ assessmentId: assessment._id, "approval.status": { $nin: ["PENDING", "REJECTED"] } }),
        OaAttempt.countDocuments({ assessmentId: assessment._id }),
        OaAttempt.countDocuments({ assessmentId: assessment._id, status: { $in: FINISHED } }),
        OaStudent.countDocuments({ assessmentId: assessment._id, "approval.status": "PENDING" }),
    ])
    return assessmentView(assessment, { locked: started > 0, slotUsage: await slotUsage(assessment), stats: { students, pending, started, finished } })
}

export const updateAssessment = async (accountId, id, patch = {}) => {
    const assessment = await owned(accountId, id)
    const started = await hasAttempts(assessment._id)
    if (assessment.status === "ARCHIVED") throw new ApiError(409, "ARCHIVED", "This test is archived.")

    if (patch.title !== undefined) assessment.title = checkedTitle(patch.title)
    if (patch.description !== undefined) assessment.description = checkedText(patch.description, "description", "Description")
    if (patch.instructions !== undefined) assessment.instructions = checkedText(patch.instructions, "instructions", "Instructions")
    if (patch.roundLabel !== undefined) assessment.roundLabel = checkedText(patch.roundLabel, "roundLabel", "Round name")
    if (patch.kind !== undefined && patch.kind !== assessment.kind) {
        if (!["TEST", "AI_INTERVIEW"].includes(patch.kind)) throw new ApiError(400, "VALIDATION_ERROR", "Choose Online test or AI interview.", { kind: "Choose Online test or AI interview." })
        // The type can change only while the round is an empty draft; after that, add a new round instead.
        if (assessment.status !== "DRAFT" || started || assessment.questions.length > 0) throw new ApiError(409, "KIND_LOCKED", "The type of a round can only be changed while it is a draft with no questions. Add a new round instead.")
        assessment.kind = patch.kind
        if (patch.kind === "TEST") assessment.aiInterviewDriveId = null
    }
    if (patch.aiInterviewDriveId !== undefined && assessment.kind === "AI_INTERVIEW") assessment.aiInterviewDriveId = cleanText(patch.aiInterviewDriveId, 64).replace(/[^a-zA-Z0-9_-]/g, "") || null

    if (patch.aiPart !== undefined) {
        if (assessment.kind !== "TEST") throw new ApiError(409, "NOT_A_TEST", "Only an online test can have an AI interview part. This round already is an AI interview.")
        const p = patch.aiPart || {}
        const driveId = cleanText(p.aiInterviewDriveId, 64).replace(/[^a-zA-Z0-9_-]/g, "") || null
        if (p.enabled && !driveId) throw new ApiError(400, "VALIDATION_ERROR", "Choose the AI interview first.", { aiInterviewDriveId: "Choose the AI interview." })
        assessment.aiPart = { enabled: Boolean(p.enabled), aiInterviewDriveId: p.enabled ? driveId : (driveId || assessment.aiPart?.aiInterviewDriveId || null), roundNumber: Math.max(1, Math.min(20, Number(p.roundNumber) || 1)), when: p.when === "AFTER_REVIEW" ? "AFTER_REVIEW" : "AFTER_SUBMIT" }
    }

    const structural = patch.sections !== undefined || patch.settings !== undefined || patch.proctoring !== undefined || patch.schedule !== undefined
    if (started && structural) {
        throw new ApiError(409, "TEST_STARTED", "Students have already started this test, so its sections, rules and schedule are locked.")
    }
    if (patch.schedule !== undefined) assessment.schedule = scheduleFrom(assessment, patch.schedule)
    if (patch.settings !== undefined) assessment.settings = applySettings(assessment, patch.settings)
    if (patch.proctoring !== undefined) assessment.proctoring = applyProctoring(assessment, patch.proctoring)

    if (patch.sections !== undefined) {
        if ((Array.isArray(patch.sections) ? patch.sections : []).length > LIMITS.sections.max) throw new ApiError(400, "VALIDATION_ERROR", `A test can have at most ${LIMITS.sections.max} sections.`, { sections: `At most ${LIMITS.sections.max}.` })
        const next = (Array.isArray(patch.sections) ? patch.sections : []).map((s) => ({ id: cleanText(s.id, 80) || newId(), title: sectionName(s.title) }))
        if (!next.length) throw new ApiError(400, "VALIDATION_ERROR", "A test needs at least one section.")
        const keep = new Set(next.map((s) => s.id))
        const orphaned = assessment.questions.filter((q) => !keep.has(q.sectionId)).length
        if (orphaned) throw new ApiError(409, "SECTION_NOT_EMPTY", `Move or delete the ${orphaned} question(s) in the removed section first.`)
        assessment.sections = next
    }
    await assessment.save()
    return assessmentView(assessment, { locked: started, slotUsage: await slotUsage(assessment) })
}

export const publish = async (accountId, id) => {
    const assessment = await owned(accountId, id)
    if (assessment.status === "PUBLISHED") return assessmentView(assessment)
    if (assessment.kind === "AI_INTERVIEW") throw new ApiError(409, "NOT_A_TEST", "This round is an AI interview. It runs from AI Interview, so there is nothing to publish here.")
    const problems = []
    if (!assessment.questions.length) problems.push("Add at least one question.")
    if (!assessment.schedule?.startAt || !assessment.schedule?.endAt) problems.push(assessment.schedule?.mode === "SLOTS" ? "Add at least one time slot and set the duration." : "Set when the test opens, when it closes and how long it lasts.")
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
    if (input.count !== undefined) intInRange(input.count, { ...LIMITS.aiCount, field: "count", label: "Number of questions" })
    return generateQuestions({ prompt: input.prompt, count: input.count, types: input.types, codeLanguages: input.codeLanguages, difficulty: input.difficulty, sectionId: ctx.defaultSectionId, sectionIds: ctx.sectionIds })
}

// ---------- students ----------

const studentView = (s, attempt, schedule) => ({
    id: String(s._id), name: s.name, email: s.email, phone: s.phone, rollNumber: s.rollNumber,
    slot: schedule?.mode === "SLOTS" ? (() => { const slot = (schedule.slots || []).find((x) => x.id === s.slotId); return slot ? { id: slot.id, startAt: slot.startAt, bookedAt: s.slotBookedAt } : null })() : undefined,
    details: s.details ? Object.fromEntries(s.details) : {},
    accessCode: (() => { try { return decryptSecret(s.codeEncrypted) } catch { return null } })(),
    invite: s.invite,
    approval: { status: s.approval?.status || "APPROVED", source: s.approval?.source || "HR", registeredAt: s.approval?.source === "SELF" ? s.createdAt : null },
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
        const name = cleanText(row?.name, LIMITS.studentName.max + 1)
        const email = cleanText(row?.email, 201)
        const rollNumber = cleanText(row?.rollNumber, LIMITS.rollNumber.max + 1)
        const key = normalizeEmail(email)
        // Each row is checked on its own and reported with the reason, so one bad line never sinks the whole upload.
        const reason = nameProblem(name, { ...LIMITS.studentName, label: "Name" }) || (email.length > 200 || !EMAIL_RE.test(email) ? "Email is not valid" : null)
            || phoneProblem(row?.phone) || (rollNumber.length > LIMITS.rollNumber.max ? `Roll number can be at most ${LIMITS.rollNumber.max} characters.` : null)
        if (reason) return skipped.push({ row: index + 1, email, reason })
        if (existing.has(key) || seen.has(key)) return skipped.push({ row: index + 1, email, reason: "Already on this test" })
        seen.add(key)
        const details = {}
        for (const [k, v] of Object.entries(row?.details || {}).slice(0, 10)) if (String(v ?? "").trim()) details[cleanText(k, 40).replace(/[.$]/g, "_")] = cleanText(v, 100)
        const code = generateAccessCode()
        docs.push({
            accountId, assessmentId: assessment._id, name, email, emailNormalized: key,
            phone: normalizePhone(row?.phone), rollNumber,
            details, codeHash: hashAccessCode(code), codeEncrypted: encryptSecret(code),
        })
    })
    if (docs.length) await OaStudent.insertMany(docs, { ordered: false })
    return { added: docs.length, skipped }
}

export const listStudents = async (accountId, id, { search, status, approval, page, pageSize } = {}) => {
    const assessment = await owned(accountId, id)
    const filter = { assessmentId: assessment._id }
    const term = String(search || "").trim().slice(0, 80)
    if (term) { const rx = new RegExp(escapeRegex(term), "i"); filter.$or = [{ name: rx }, { email: rx }, { rollNumber: rx }] }
    if (["NOT_SENT", "SENT", "FAILED"].includes(status)) filter["invite.status"] = status
    // "Waiting for approval" and "Rejected" are their own lists; the main list shows only people who are approved.
    if (approval === "PENDING" || approval === "REJECTED") filter["approval.status"] = approval
    else filter["approval.status"] = { $nin: ["PENDING", "REJECTED"] }
    const p = pageParams({ page, pageSize })
    const [items, total, attempts] = await Promise.all([
        OaStudent.find(filter).sort({ createdAt: 1 }).skip((p.page - 1) * p.pageSize).limit(p.pageSize),
        OaStudent.countDocuments(filter),
        OaAttempt.find({ assessmentId: assessment._id }).select("studentId status percent violationCount").lean(),
    ])
    const byStudent = new Map(attempts.map((a) => [String(a.studentId), a]))
    return { items: items.map((s) => studentView(s, byStudent.get(String(s._id)), assessment.schedule)), total, ...p }
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
    const brand = await emailBrand(account)
    const filter = { assessmentId: assessment._id }
    if (Array.isArray(studentIds) && studentIds.length) filter._id = { $in: studentIds.filter((x) => mongoose.isValidObjectId(x)) }
    // Idempotent: a repeated click only mails people who have not been mailed (unless the admin asks to resend).
    filter["approval.status"] = { $nin: ["PENDING", "REJECTED"] }     // someone waiting for approval is never emailed their code
    if (!resend) filter["invite.status"] = { $ne: "SENT" }
    const students = await OaStudent.find(filter).limit(MAX_STUDENTS_PER_UPLOAD)

    let sent = 0; const failed = []
    const queue = [...students]
    const worker = async () => {
        while (queue.length) {
            const student = queue.shift()
            const code = decryptSecret(student.codeEncrypted)
            const mail = inviteEmail({ assessment, student, code, orgName: brand.name || account?.orgName || "Your organizer", brand })
            const result = await sendOaEmail({ accountId, to: student.email, eventType: "OA_INVITE", fromName: brand.name || account?.orgName, ...mail, metadata: { assessmentId: String(assessment._id), studentId: String(student._id) } })
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
        OaStudent.find({ assessmentId: assessment._id, "approval.status": { $nin: ["PENDING", "REJECTED"] } }).lean(),
        OaAttempt.find({ assessmentId: assessment._id }).select("-answers -grades -order").lean(),
    ])
    const byStudent = new Map(attempts.map((a) => [String(a.studentId), a]))
    // The AI interview taken with this test: who has done it and how they scored, matched by email, so both results sit in one row.
    const aiByEmail = new Map()
    const aiDriveId = assessment.aiPart?.enabled ? assessment.aiPart.aiInterviewDriveId : assessment.kind === "AI_INTERVIEW" ? assessment.aiInterviewDriveId : null
    if (aiDriveId && mongoose.isValidObjectId(aiDriveId)) {
        const drive = await InterviewDrive.findById(aiDriveId).select("rounds.roundNumber rounds.candidates.email rounds.candidates.status rounds.candidates.aiScore").lean()
        const roundNumber = assessment.aiPart?.enabled ? assessment.aiPart.roundNumber || 1 : 1
        const round = (drive?.rounds || []).find((r) => r.roundNumber === roundNumber) || drive?.rounds?.[0]
        for (const c of round?.candidates || []) aiByEmail.set(String(c.email || "").trim().toLowerCase(), { status: c.status, score: c.aiScore > 0 ? c.aiScore : null })
    }
    const ranks = rankRows(attempts.map((a) => ({ id: String(a._id), percent: a.percent, durationSec: durationSec(a), eligible: isRankable(a) })))
    const pass = assessment.settings?.passPercent ?? 40
    return students.map((s) => {
        const a = byStudent.get(String(s._id))
        const finished = a && FINISHED.includes(a.status)
        return {
            attemptId: a ? String(a._id) : null, studentId: String(s._id),
            name: s.name, email: s.email, rollNumber: s.rollNumber, details: s.details || {},
            slotStartAt: slotStartOf(assessment, s.slotId),
            status: attemptStatusOf(a),
            score: a ? a.score : null, maxScore: a ? a.maxScore : null, percent: finished ? a.percent : null,
            rank: a ? ranks.get(String(a._id)) ?? null : null,
            passed: finished && isRankable(a) ? a.percent >= pass : null,
            gradingStatus: a?.gradingStatus || null,
            aiInvite: a?.aiHandoff?.status || null,
            aiResult: aiByEmail.get(String(s.email || "").trim().toLowerCase()) || null,
            violationCount: a?.violationCount || 0,
            adminDecision: a?.adminDecision || null,
            timeTakenSec: a ? durationSec(a) : null,
            submittedAt: a?.submittedAt || null,
            endReason: a?.endReason || null,
            // Where and on what the candidate sat the test, as recorded when they pressed Start.
            ip: a?.ip || null, place: a?.environment?.place || null, latitude: a?.environment?.latitude ?? null, longitude: a?.environment?.longitude ?? null,
            browser: a?.environment?.browser || null, os: a?.environment?.os || null, device: a?.environment?.device || null,
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
    if (q.minPercent !== undefined && q.minPercent !== "") {
        if (!Number.isFinite(min) || min < 0 || min > 100) throw new ApiError(400, "VALIDATION_ERROR", "The minimum percentage must be between 0 and 100.", { minPercent: "0 to 100" })
        list = list.filter((r) => (r.percent ?? -1) >= min)
    }
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
    const head = ["Rank", "Name", "Email", "Roll number", "Status", "Score", "Out of", "Percent", "Result", "Violations", "Time taken (min)", "Submitted at", "Decision", "IP address", "Location", "Latitude", "Longitude", "Browser", "Operating system", "Device"]
    const lines = [head.map(csvEscape).join(",")]
    for (const r of rows) {
        lines.push([
            r.rank ?? "", r.name, r.email, r.rollNumber, label(r.status), r.score ?? "", r.maxScore ?? "", r.percent ?? "",
            r.passed === null ? "" : r.passed ? "Passed" : "Not passed", r.violationCount,
            r.timeTakenSec === null ? "" : Math.round(r.timeTakenSec / 6) / 10, r.submittedAt ? new Date(r.submittedAt).toISOString() : "", label(r.adminDecision),
            r.ip ?? "", r.place ?? "", r.latitude ?? "", r.longitude ?? "", r.browser ?? "", r.os ?? "", r.device ?? "",
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
    // While the candidate is still writing, nobody sees their answers: not the answers, not the running score.
    const answersHidden = attempt.status === "IN_PROGRESS"
    const sections = attempt.order.sections.map((s) => ({
        sectionId: s.sectionId, number: assessment.sections.findIndex((x) => x.id === s.sectionId) + 1,
        title: sectionName(assessment.sections.find((x) => x.id === s.sectionId)?.title),
        questions: s.questionIds.map((qid) => {
            const q = byId.get(qid); if (!q) return null
            if (answersHidden) return { id: q.id, type: q.type, text: q.text, marks: q.marks, negativeMarks: q.negativeMarks, options: [], correct: [], correctText: [], answer: null, answered: false, grade: null }
            const stored = attempt.answers?.[qid]?.value
            // A video answer is handed over as a short-lived signed link, never as its storage key.
            const answer = q.type === "VIDEO" ? (stored?.videoKey ? { video: { url: signedVideoPath(String(attempt._id), q.id), durationSec: stored.durationSec ?? null, size: stored.size ?? null } } : null) : stored
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
            score: answersHidden ? null : attempt.score, maxScore: attempt.maxScore, percent: answersHidden ? null : attempt.percent, gradingStatus: attempt.gradingStatus,
            violationCount: attempt.violationCount, adminDecision: attempt.adminDecision, environment: attempt.environment, ip: attempt.ip,
        },
        student: student ? { name: student.name, email: student.email, rollNumber: student.rollNumber, details: student.details || {} } : null,
        passPercent: assessment.settings?.passPercent ?? 40,
        answersHidden,
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
    const result = gradeAttempt({ questions: assessment.questions.map((q) => (q.toObject ? q.toObject() : q)), answers: attempt.answers, grades: next, settings: assessment.settings?.toObject?.() || assessment.settings || {} })
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

const slotStartOf = (assessment, slotId) => (assessment.schedule?.mode === "SLOTS" ? (assessment.schedule.slots || []).find((x) => x.id === slotId)?.startAt || null : undefined)

export const live = async (accountId, id) => {
    const assessment = await owned(accountId, id)
    const [students, attempts] = await Promise.all([
        OaStudent.find({ assessmentId: assessment._id, "approval.status": { $nin: ["PENDING", "REJECTED"] } }).select("name email rollNumber slotId").lean(),
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
            slotStartAt: slotStartOf(assessment, s.slotId),
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

/** The candidates of one round who clear a cut-off (a minimum percentage, the top ranks, or both). */
const qualifiersOf = async (source, { minPercent, topN }) => {
    const hasMin = minPercent !== undefined && minPercent !== null && minPercent !== ""
    const hasTop = topN !== undefined && topN !== null && topN !== ""
    if (!hasMin && !hasTop) throw new ApiError(400, "VALIDATION_ERROR", "Choose a cut-off: a minimum percentage or the top ranks.", { cutoff: "Required." })
    const fields = {}
    if (hasMin && !(Number.isFinite(Number(minPercent)) && Number(minPercent) >= 0 && Number(minPercent) <= 100)) fields.minPercent = "The minimum must be between 0 and 100."
    if (hasTop && !(Number.isInteger(Number(topN)) && Number(topN) >= 1 && Number(topN) <= 100000)) fields.topN = "Enter a whole number of ranks, 1 or more."
    throwFields(fields)
    const rows = await buildResultRows(source)
    let qualified = rows.filter((r) => r.rank !== null)
    if (hasMin) qualified = qualified.filter((r) => r.percent >= Number(minPercent))
    if (hasTop) qualified = qualified.filter((r) => r.rank <= Number(topN)) // ties at the cut-off all advance
    if (!qualified.length) throw new ApiError(409, "NO_ONE_QUALIFIES", "No one meets that cut-off yet. Check the results and the cut-off.")
    return qualified.map((r) => r.studentId)
}

/**
 * The round after `id`. With a cut-off, the candidates who clear it are carried over (each gets a new access code).
 * `empty: true` starts the round with no candidates, for the organizer to add their own.
 */
export const createNextRound = async (accountId, id, { title, minPercent, topN, roundLabel, kind, empty = false, driveId = null, roundNumber } = {}) => {
    const source = await owned(accountId, id)
    const studentIds = empty ? [] : await qualifiersOf(source, { minPercent, topN })
    const next = new OaAssessment({
        accountId, title: cleanText(title, LIMITS.title.max) || `${source.title} - next round`, roundLabel: cleanText(roundLabel, LIMITS.roundLabel.max),
        description: source.description, instructions: source.instructions, previousAssessmentId: source._id,
        driveId: driveId || source.driveId || null, roundNumber: roundNumber || (source.roundNumber || 1) + 1, kind: kind === "AI_INTERVIEW" ? "AI_INTERVIEW" : "TEST",
        settings: source.settings.toObject(), proctoring: source.proctoring.toObject(), sections: [{ id: newId(), title: "" }],
    })
    await next.save()
    const people = studentIds.length ? await OaStudent.find({ _id: { $in: studentIds } }).lean() : []
    const docs = people.map((s) => {
        const code = generateAccessCode()
        return { accountId, assessmentId: next._id, name: s.name, email: s.email, emailNormalized: s.emailNormalized, phone: s.phone, rollNumber: s.rollNumber, details: s.details, codeHash: hashAccessCode(code), codeEncrypted: encryptSecret(code) }
    })
    if (docs.length) await OaStudent.insertMany(docs, { ordered: false })
    return { assessmentId: String(next._id), students: docs.length }
}

// ---------- open registration: candidates register themselves, the organizer approves ----------

/** Turn the open link on or off, set when it closes and how many may register. `rotate` replaces the link (the old one stops working). */
export const setRegistration = async (accountId, id, { enabled, closesAt, maxRegistrations, rotate } = {}) => {
    const assessment = await owned(accountId, id)
    if (assessment.status === "ARCHIVED") throw new ApiError(409, "ARCHIVED", "This round is archived.")
    const reg = assessment.registration?.toObject?.() || assessment.registration || {}
    const next = { enabled: Boolean(reg.enabled), token: reg.token, closesAt: reg.closesAt || null, maxRegistrations: reg.maxRegistrations ?? null }
    if (typeof enabled === "boolean") next.enabled = enabled
    if (closesAt !== undefined) {
        if (closesAt === null || closesAt === "") next.closesAt = null
        else {
            const when = new Date(closesAt)
            if (Number.isNaN(when.getTime())) throw new ApiError(400, "VALIDATION_ERROR", "Choose a valid closing date.", { closesAt: "Choose a valid date and time." })
            next.closesAt = when
        }
    }
    if (maxRegistrations !== undefined) {
        if (maxRegistrations === null || maxRegistrations === "") next.maxRegistrations = null
        else {
            const n = Number(maxRegistrations)
            if (!Number.isInteger(n) || n < 1 || n > 100000) throw new ApiError(400, "VALIDATION_ERROR", "The limit must be a whole number from 1 to 100000.", { maxRegistrations: "A whole number from 1 to 100000." })
            next.maxRegistrations = n
        }
    }
    if (next.enabled && (!next.token || rotate === true)) next.token = crypto.randomBytes(18).toString("base64url")
    assessment.registration = next
    await assessment.save()
    return getAssessment(accountId, id)
}

const registrationOpen = async (assessment) => {
    const reg = assessment.registration || {}
    if (!reg.enabled) return { open: false, reason: "Registration for this test is not open." }
    if (assessment.status === "ARCHIVED") return { open: false, reason: "This test is no longer available." }
    if (assessment.schedule?.endAt && schedulePhase(assessment.schedule) === "ENDED") return { open: false, reason: "This test has already closed." }
    if (reg.closesAt && new Date(reg.closesAt).getTime() <= Date.now()) return { open: false, reason: "Registration has closed." }
    if (reg.maxRegistrations) {
        const used = await OaStudent.countDocuments({ assessmentId: assessment._id, "approval.source": "SELF" })
        if (used >= reg.maxRegistrations) return { open: false, reason: "Registration is full." }
    }
    return { open: true, reason: null }
}

const byToken = async (token) => {
    const value = String(token || "")
    if (!/^[A-Za-z0-9_-]{16,40}$/.test(value)) return null
    return OaAssessment.findOne({ "registration.token": value })
}

/** What the public registration page shows: who is hosting, and whether it can take registrations right now. */
export const registrationInfo = async (token) => {
    const assessment = await byToken(token)
    if (!assessment) throw new ApiError(404, "NOT_FOUND", "This registration link is not valid. Ask the organizer for a new one.")
    const [state, brand] = await Promise.all([registrationOpen(assessment), brandForAssessmentId(assessment._id)])
    return { title: assessment.title, round: assessment.roundNumber || 1, roundLabel: assessment.roundLabel || "", brand: { name: brand.name, logoPath: brand.logoPath }, ...state, closesAt: assessment.registration?.closesAt || null }
}

/** A candidate registers. They wait for approval: no access code is sent, and they cannot sign in until the organizer approves. */
export const registerSelf = async (token, body = {}, { ip } = {}) => {
    const assessment = await byToken(token)
    if (!assessment) throw new ApiError(404, "NOT_FOUND", "This registration link is not valid. Ask the organizer for a new one.")
    rateLimit({ key: `oa-join-all:${assessment._id}`, max: 5000, windowMs: 60 * 60 * 1000 })
    if (ip) rateLimit({ key: `oa-join-ip:${ip}`, max: 20, windowMs: 60 * 60 * 1000 })
    // A hidden field real people never fill in: bots do. Answer as if it worked so they learn nothing.
    if (String(body?.website || "").trim()) return { received: true }

    const name = cleanText(body?.name, LIMITS.studentName.max + 1)
    const email = cleanText(body?.email, 201)
    const rollNumber = cleanText(body?.rollNumber, LIMITS.rollNumber.max + 1)
    const fields = {}
    const nameIssue = nameProblem(name, { ...LIMITS.studentName, label: "Name" }); if (nameIssue) fields.name = nameIssue
    if (email.length > 200 || !EMAIL_RE.test(email)) fields.email = "Enter a valid email address."
    const phoneIssue = phoneProblem(body?.phone); if (phoneIssue) fields.phone = phoneIssue
    if (rollNumber.length > LIMITS.rollNumber.max) fields.rollNumber = `At most ${LIMITS.rollNumber.max} characters.`
    if (Object.keys(fields).length) throw new ApiError(400, "VALIDATION_ERROR", Object.values(fields)[0], fields)

    const emailNormalized = normalizeEmail(email)
    rateLimit({ key: `oa-join-email:${assessment._id}:${emailNormalized}`, max: 4, windowMs: 60 * 60 * 1000 })
    const state = await registrationOpen(assessment)
    if (!state.open) throw new ApiError(409, "REGISTRATION_CLOSED", state.reason)

    // Already on the list (added by the organizer, or registered before): the same answer as a new registration, so this
    // page cannot be used to find out who is invited.
    if (await OaStudent.exists({ assessmentId: assessment._id, emailNormalized })) return { received: true }
    const code = generateAccessCode()
    try {
        await OaStudent.create({
            accountId: assessment.accountId, assessmentId: assessment._id, name, email, emailNormalized,
            phone: normalizePhone(body?.phone), rollNumber, codeHash: hashAccessCode(code), codeEncrypted: encryptSecret(code),
            approval: { status: "PENDING", source: "SELF", decidedAt: null },
        })
    } catch (error) {
        if (error.code !== 11000) throw error
    }
    return { received: true }
}

/** Approve or reject registrations. Approving emails the invitation (with the access code) at once when the round is published. */
export const decideStudents = async (accountId, id, { studentIds, decision } = {}) => {
    const assessment = await owned(accountId, id)
    if (!["APPROVE", "REJECT"].includes(decision)) throw new ApiError(400, "VALIDATION_ERROR", "Choose approve or reject.")
    const ids = [...new Set((Array.isArray(studentIds) ? studentIds : []).map(String))].filter((x) => mongoose.isValidObjectId(x)).slice(0, 500)
    if (!ids.length) throw new ApiError(400, "VALIDATION_ERROR", "Select at least one candidate.")
    const target = decision === "APPROVE" ? ["PENDING", "REJECTED"] : ["PENDING"]
    const found = await OaStudent.find({ _id: { $in: ids }, assessmentId: assessment._id, "approval.status": { $in: target } }).select("_id").lean()
    if (!found.length) throw new ApiError(409, "NOTHING_TO_DECIDE", "Those candidates have already been decided.")
    const decided = found.map((s) => s._id)
    await OaStudent.updateMany({ _id: { $in: decided } }, { $set: { "approval.status": decision === "APPROVE" ? "APPROVED" : "REJECTED", "approval.decidedAt": new Date() } })
    if (decision === "REJECT") return { decision, decided: decided.length, invited: null }

    // Approved: mail them now if the round can take candidates; otherwise they are mailed with everyone else when it is published.
    let invited = null
    if (assessment.status === "PUBLISHED" && schedulePhase(assessment.schedule) !== "ENDED") invited = await sendInvites(accountId, id, { studentIds: decided.map(String) })
    return { decision, decided: decided.length, invited }
}
