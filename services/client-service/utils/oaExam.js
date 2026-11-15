import crypto from "crypto"

// ---------- per-student question order ----------

// Deterministic PRNG so a student's order is different from everyone else's but identical every time they reload.
const mulberry32 = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const seedFrom = (value) => crypto.createHash("sha256").update(String(value)).digest().readUInt32BE(0)

export const seededShuffle = (items, seedValue) => {
    const random = mulberry32(seedFrom(seedValue))
    const list = [...items]
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list
}

/**
 * The order this student sees: questions are shuffled inside each section (sections can be shuffled too), and each
 * choice question's options are shuffled. Stored on the attempt so it never changes mid-exam.
 */
export const buildPaperOrder = ({ sections, questions, settings = {}, seed }) => {
    const firstSection = sections[0]?.id
    const bySection = new Map(sections.map((s) => [s.id, []]))
    for (const q of questions) (bySection.get(q.sectionId) || bySection.get(firstSection))?.push(q)

    let orderedSections = sections.filter((s) => (bySection.get(s.id) || []).length)
    if (settings.shuffleSections) orderedSections = seededShuffle(orderedSections, `${seed}:sections`)

    const optionOrder = {}
    const paper = orderedSections.map((section) => {
        let list = bySection.get(section.id)
        if (settings.shuffleQuestions !== false) list = seededShuffle(list, `${seed}:q:${section.id}`)
        if (settings.shuffleOptions !== false) {
            for (const q of list) if (q.options?.length) optionOrder[q.id] = seededShuffle(q.options.map((o) => o.id), `${seed}:o:${q.id}`)
        }
        return { sectionId: section.id, questionIds: list.map((q) => q.id) }
    })
    return { sections: paper, optionOrder }
}

// ---------- grading ----------

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const hasAnswer = (value) => {
    if (value === null || value === undefined) return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === "object") return Boolean(String(value.code || "").trim())
    return String(value).trim().length > 0
}

/**
 * Grade one answer. Returns { marks, auto, needsReview }:
 *  - marks === null  -> waiting for the admin (long answers and code are never guessed at)
 *  - needsReview     -> an automatic score the admin may want to look at (keyword-matched short answers)
 */
export const gradeAnswer = (question, answer) => {
    const given = hasAnswer(answer)
    if (question.type === "MCQ" || question.type === "MSQ") {
        if (!given) return { marks: 0, auto: true, needsReview: false }
        const chosen = (Array.isArray(answer) ? answer : [answer]).map(String)
        const right = sameSet(chosen, question.correct.map(String))
        return { marks: right ? question.marks : 0 - (question.negativeMarks || 0), auto: true, needsReview: false }
    }
    if (!given) return { marks: 0, auto: true, needsReview: false }
    if (question.type === "SHORT" && question.keywords?.length) {
        const text = String(answer).toLowerCase()
        const hit = question.keywords.filter((k) => new RegExp(`(^|[^a-z0-9])${escapeRegex(k.toLowerCase())}([^a-z0-9]|$)`).test(text)).length
        const marks = Math.round((question.marks * hit / question.keywords.length) * 100) / 100
        return { marks, auto: true, needsReview: true }
    }
    return { marks: null, auto: false, needsReview: true }
}

/** Grade a whole attempt. Manual grades already given by the admin are kept as they are. */
export const gradeAttempt = ({ questions, answers = {}, grades = {} }) => {
    const nextGrades = {}
    let score = 0
    let maxScore = 0
    let pending = 0
    for (const q of questions) {
        maxScore += q.marks
        const existing = grades[q.id]
        const entry = existing && existing.auto === false && existing.marks !== null && existing.marks !== undefined
            ? existing
            : { ...gradeAnswer(q, answers[q.id]?.value), ...(existing?.feedback ? { feedback: existing.feedback } : {}) }
        nextGrades[q.id] = entry
        if (entry.marks === null) pending += 1
        else score += entry.marks
    }
    score = Math.max(0, Math.round(score * 100) / 100)
    return {
        grades: nextGrades, score, maxScore,
        percent: maxScore ? Math.round((score / maxScore) * 10000) / 100 : 0,
        gradingStatus: pending ? "PENDING_REVIEW" : "COMPLETE",
        pendingCount: pending,
    }
}

// ---------- schedule ----------

export const MIN_DURATION = 5
export const MAX_DURATION = 360
const MIN = 60 * 1000

/** Checks a schedule and returns it as Dates/numbers, or { error, field }. */
export const parseSchedule = (input, { now = Date.now() } = {}) => {
    const startAt = new Date(input?.startAt)
    const endAt = new Date(input?.endAt)
    const durationMinutes = Number(input?.durationMinutes)
    const lateEntryMinutes = input?.lateEntryMinutes === undefined || input?.lateEntryMinutes === "" ? 10 : Number(input.lateEntryMinutes)
    if (Number.isNaN(startAt.getTime())) return { error: "Choose when the test starts.", field: "startAt" }
    if (Number.isNaN(endAt.getTime())) return { error: "Choose when the test closes.", field: "endAt" }
    if (!Number.isFinite(durationMinutes) || durationMinutes < MIN_DURATION || durationMinutes > MAX_DURATION) {
        return { error: `Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes.`, field: "durationMinutes" }
    }
    if (!Number.isFinite(lateEntryMinutes) || lateEntryMinutes < 0 || lateEntryMinutes > 120) return { error: "Late entry must be between 0 and 120 minutes.", field: "lateEntryMinutes" }
    if (endAt.getTime() < startAt.getTime() + durationMinutes * MIN) return { error: "The test must close at least one full duration after it starts.", field: "endAt" }
    if (endAt.getTime() <= now) return { error: "The closing time is already in the past.", field: "endAt" }
    return { startAt, endAt, durationMinutes, lateEntryMinutes, timezone: String(input?.timezone || "Asia/Kolkata").slice(0, 60) }
}

export const WAITING_ROOM_MINUTES = 15

/** Where a test is in time, from the server clock. UPCOMING: not yet open. OPEN: entry allowed. CLOSED_TO_ENTRY: started, too late to begin. ENDED. */
export const schedulePhase = (schedule, now = Date.now()) => {
    const start = new Date(schedule.startAt).getTime()
    const end = new Date(schedule.endAt).getTime()
    const lastEntry = Math.min(start + (schedule.lateEntryMinutes ?? 10) * MIN, end - MIN)
    if (now >= end) return "ENDED"
    if (now < start) return "UPCOMING"
    if (now <= lastEntry) return "OPEN"
    return "CLOSED_TO_ENTRY"
}

export const inWaitingRoom = (schedule, now = Date.now()) => {
    const start = new Date(schedule.startAt).getTime()
    return now >= start - WAITING_ROOM_MINUTES * MIN && now < start
}

/** The moment this student's attempt ends: their own duration, but never past the test's closing time. */
export const attemptDeadline = (schedule, startedAt) => {
    const own = new Date(startedAt).getTime() + schedule.durationMinutes * MIN
    return new Date(Math.min(own, new Date(schedule.endAt).getTime()))
}

// ---------- ranking ----------

/**
 * Competition ranking (1, 2, 2, 4): higher percent first, then faster completion. Rows with `eligible: false`
 * (still in progress, disqualified) get no rank.
 */
export const rankRows = (rows) => {
    const eligible = rows.filter((r) => r.eligible).sort((a, b) => b.percent - a.percent || (a.durationSec ?? Infinity) - (b.durationSec ?? Infinity))
    const ranks = new Map()
    let previous = null
    eligible.forEach((row, index) => {
        const tie = previous && previous.percent === row.percent && (previous.durationSec ?? Infinity) === (row.durationSec ?? Infinity)
        const rank = tie ? previous.rank : index + 1
        ranks.set(row.id, rank)
        previous = { percent: row.percent, durationSec: row.durationSec, rank }
    })
    return ranks
}
