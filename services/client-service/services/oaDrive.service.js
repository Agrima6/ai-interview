import mongoose from "mongoose"
import { OaAssessment, OaAttempt, OaDrive, OaStudent } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import { schedulePhase } from "../utils/oaExam.js"
import { LIMITS, textLength } from "../utils/oaValidate.js"
import { createAssessment, createNextRound } from "./oaAssessment.service.js"

// A drive is one hiring drive; its rounds (Round 1, Round 2, ...) are assessments that point back at it.

const FINISHED = ["SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"]
const MAX_ROUNDS = 10

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const checkedTitle = (value) => {
    const title = textLength(value, { max: LIMITS.title.max, field: "title", label: "The drive name" })
    if (title.length < LIMITS.title.min) throw new ApiError(400, "VALIDATION_ERROR", `Give the drive a name (at least ${LIMITS.title.min} characters).`, { title: `At least ${LIMITS.title.min} characters.` })
    return title
}

const ownedDrive = async (accountId, id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "NOT_FOUND", "Drive not found.")
    const drive = await OaDrive.findOne({ _id: id, accountId })
    if (!drive) throw new ApiError(404, "NOT_FOUND", "Drive not found.")
    return drive
}

/**
 * Tests made before drives existed get one each, the first time their owner opens the list: a test that was created
 * as "the next round" of another joins that test's drive. Safe to run again and again, and by two requests at once.
 */
export const ensureDrives = async (accountId) => {
    if (!(await OaAssessment.exists({ accountId, driveId: null }))) return
    const orphans = await OaAssessment.find({ accountId, driveId: null }).select("title description previousAssessmentId status createdAt").sort({ createdAt: 1 })
    for (const a of orphans) {
        const previous = a.previousAssessmentId ? await OaAssessment.findOne({ _id: a.previousAssessmentId, accountId }).select("driveId") : null
        if (previous?.driveId) {
            const last = await OaAssessment.findOne({ driveId: previous.driveId }).sort({ roundNumber: -1 }).select("roundNumber")
            await OaAssessment.updateOne({ _id: a._id, driveId: null }, { $set: { driveId: previous.driveId, roundNumber: (last?.roundNumber || 1) + 1 } })
            continue
        }
        const drive = await OaDrive.create({ accountId, title: a.title, description: a.description || "", status: a.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE", createdAt: a.createdAt })
        const claimed = await OaAssessment.updateOne({ _id: a._id, driveId: null }, { $set: { driveId: drive._id, roundNumber: 1 } })
        // Another request got there first: its drive stands, this one is dropped.
        if (!claimed.modifiedCount) await OaDrive.deleteOne({ _id: drive._id })
    }
}

const roundView = (a, stats = {}) => ({
    id: String(a._id), roundNumber: a.roundNumber || 1, kind: a.kind || "TEST", title: a.title, name: a.roundLabel || "",
    status: a.status, phase: a.status === "PUBLISHED" && a.schedule?.startAt && a.schedule?.endAt ? schedulePhase(a.schedule) : null,
    schedule: a.schedule?.startAt ? { mode: a.schedule.mode, startAt: a.schedule.startAt, endAt: a.schedule.endAt, durationMinutes: a.schedule.durationMinutes } : null,
    questionCount: a.questions?.length || 0,
    stats: { candidates: stats.candidates || 0, started: stats.started || 0, finished: stats.finished || 0 },
})

const driveView = (d, rounds = []) => ({
    id: String(d._id), title: d.title, description: d.description, status: d.status, createdAt: d.createdAt, updatedAt: d.updatedAt,
    rounds, candidates: rounds[0]?.stats.candidates || 0,
})

const roundsOf = async (driveIds) => {
    const rounds = await OaAssessment.find({ driveId: { $in: driveIds } }).select("driveId roundNumber kind title roundLabel status schedule questions.id").sort({ roundNumber: 1, createdAt: 1 }).lean()
    const ids = rounds.map((r) => r._id)
    const [students, attempts] = await Promise.all([
        // People still waiting for approval (or turned down) are not candidates yet.
        OaStudent.aggregate([{ $match: { assessmentId: { $in: ids }, "approval.status": { $nin: ["PENDING", "REJECTED"] } } }, { $group: { _id: "$assessmentId", n: { $sum: 1 } } }]),
        OaAttempt.aggregate([{ $match: { assessmentId: { $in: ids } } }, { $group: { _id: { a: "$assessmentId", done: { $in: ["$status", FINISHED] } }, n: { $sum: 1 } } }]),
    ])
    const stats = new Map()
    const bump = (id, key, n) => { const row = stats.get(String(id)) || {}; row[key] = (row[key] || 0) + n; stats.set(String(id), row) }
    for (const s of students) bump(s._id, "candidates", s.n)
    for (const a of attempts) { bump(a._id.a, "started", a.n); if (a._id.done) bump(a._id.a, "finished", a.n) }
    const byDrive = new Map()
    for (const r of rounds) {
        const list = byDrive.get(String(r.driveId)) || []
        list.push(roundView(r, stats.get(String(r._id))))
        byDrive.set(String(r.driveId), list)
    }
    return byDrive
}

export const listDrives = async (accountId, { status, search, page, pageSize } = {}) => {
    await ensureDrives(accountId)
    const filter = { accountId, status: status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE" }
    const term = String(search || "").trim().slice(0, 80)
    if (term) filter.title = new RegExp(escapeRegex(term), "i")
    const p = { page: Math.max(parseInt(page, 10) || 1, 1), pageSize: [10, 25, 50, 100].includes(parseInt(pageSize, 10)) ? parseInt(pageSize, 10) : 10 }
    const [items, total] = await Promise.all([
        OaDrive.find(filter).sort({ createdAt: -1 }).skip((p.page - 1) * p.pageSize).limit(p.pageSize).lean(),
        OaDrive.countDocuments(filter),
    ])
    const rounds = await roundsOf(items.map((d) => d._id))
    return { items: items.map((d) => driveView(d, rounds.get(String(d._id)) || [])), total, ...p }
}

/** Every drive of an account (active and archived), newest first, for the organization-wide drives list. */
export const listEveryDrive = async (accountId, { limit = 500 } = {}) => {
    await ensureDrives(accountId)
    const items = await OaDrive.find({ accountId }).sort({ updatedAt: -1 }).limit(limit).lean()
    const rounds = await roundsOf(items.map((d) => d._id))
    return items.map((d) => driveView(d, rounds.get(String(d._id)) || []))
}

export const getDrive = async (accountId, id) => {
    await ensureDrives(accountId)
    const drive = await ownedDrive(accountId, id)
    return driveView(drive, (await roundsOf([drive._id])).get(String(drive._id)) || [])
}

/** A new drive always starts with Round 1, an online test in draft, so the organizer lands straight on step 1. */
export const createDrive = async (accountId, input = {}) => {
    const title = checkedTitle(input.title)
    const description = textLength(input.description, { max: LIMITS.description.max, field: "description", label: "Description" })
    const kind = input.kind === undefined ? "TEST" : input.kind
    if (!["TEST", "AI_INTERVIEW"].includes(kind)) throw new ApiError(400, "VALIDATION_ERROR", "Choose Online test or AI interview for Round 1.", { kind: "Choose Online test or AI interview." })
    const drive = await OaDrive.create({ accountId, title, description })
    try {
        const round = await createAssessment(accountId, { title, description, driveId: drive._id, roundNumber: 1 })
        if (kind !== "TEST") await OaAssessment.updateOne({ _id: round.id }, { $set: { kind } })
        return { ...driveView(drive), firstRoundId: round.id }
    } catch (error) {
        await OaDrive.deleteOne({ _id: drive._id })
        throw error
    }
}

export const updateDrive = async (accountId, id, patch = {}) => {
    const drive = await ownedDrive(accountId, id)
    if (patch.title !== undefined) drive.title = checkedTitle(patch.title)
    if (patch.description !== undefined) drive.description = textLength(patch.description, { max: LIMITS.description.max, field: "description", label: "Description" })
    if (patch.status !== undefined) {
        if (!["ACTIVE", "ARCHIVED"].includes(patch.status)) throw new ApiError(400, "VALIDATION_ERROR", "Unknown status.")
        // Archiving closes every round: candidates can no longer sign in to any of them.
        if (patch.status === "ARCHIVED" && drive.status !== "ARCHIVED") await OaAssessment.updateMany({ driveId: drive._id }, { $set: { status: "ARCHIVED" } })
        drive.status = patch.status
    }
    await drive.save()
    return getDrive(accountId, id)
}

/**
 * Add the next round. `kind`: TEST (an online test) or AI_INTERVIEW. `candidates`: QUALIFIED carries over whoever
 * clears the cut-off (`minPercent` and/or `topN`) in the round before; NONE starts empty.
 */
export const addRound = async (accountId, id, { kind, name, candidates, minPercent, topN } = {}) => {
    const drive = await ownedDrive(accountId, id)
    if (drive.status === "ARCHIVED") throw new ApiError(409, "ARCHIVED", "This drive is archived.")
    const last = await OaAssessment.findOne({ driveId: drive._id, accountId }).sort({ roundNumber: -1 })
    if (!last) throw new ApiError(409, "NO_ROUNDS", "This drive has no rounds.")
    if (last.roundNumber >= MAX_ROUNDS) throw new ApiError(409, "LIMIT", `A drive can have at most ${MAX_ROUNDS} rounds.`)
    const roundNumber = last.roundNumber + 1
    const made = await createNextRound(accountId, last._id, {
        title: `${drive.title} - Round ${roundNumber}`.slice(0, LIMITS.title.max), roundLabel: name, kind,
        empty: candidates !== "QUALIFIED", minPercent, topN, driveId: drive._id, roundNumber,
    })
    return { ...made, roundNumber }
}

/** The older "next round" button on a test: same as adding a round to that test's drive with a cut-off. */
export const nextRoundOf = async (accountId, assessmentId, body = {}) => {
    await ensureDrives(accountId)
    return createNextRound(accountId, assessmentId, body)
}
