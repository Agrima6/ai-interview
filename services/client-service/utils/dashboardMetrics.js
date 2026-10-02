// Dashboard rules that need no database: filter validation and metric arithmetic. Unit-tested.
import { ApiError } from "./response.js"

const DAY = 24 * 60 * 60 * 1000
const CANDIDATE_STATUSES = ["INVITED", "SCHEDULED", "SHORTLISTED", "COMPLETED", "REJECTED"]
const AI_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]
const LANGUAGES = ["en", "hi", "hinglish"]

// Filters the platform has no data for yet. They are accepted (so the UI's common filter model stays stable)
// but reported back as unsupported instead of being silently ignored.
export const UNSUPPORTED_FILTERS = ["organizationId", "locationId", "recruiterId", "hiringManagerId", "source", "jobType", "employmentType"]

const one = (value) => (Array.isArray(value) ? value[0] : value)
const text = (value, max = 80) => (typeof one(value) === "string" ? one(value).trim().slice(0, max) : "")
const bad = (message) => new ApiError(400, "INVALID_FILTER", message)

const parseDate = (value, name) => {
    if (!text(value)) return null
    const d = new Date(text(value))
    if (Number.isNaN(d.getTime())) throw bad(`${name} must be a valid date.`)
    return d
}

/** Validate the common filter model. Unknown fields are dropped; bad values are rejected, never guessed. */
export function parseFilters(query = {}, now = Date.now()) {
    let to = parseDate(query.to, "to") || new Date(now)
    let from = parseDate(query.from, "from") || new Date(to.getTime() - 30 * DAY)
    if (from > to) throw bad("from must be before to.")
    if (to.getTime() - from.getTime() > 731 * DAY) throw bad("The date range cannot exceed two years.")

    const pick = (name, allowed) => {
        const v = text(query[name]).toUpperCase()
        if (!v) return undefined
        if (!allowed.includes(v)) throw bad(`${name} must be one of ${allowed.join(", ")}.`)
        return v
    }
    const interviewStatus = pick("interviewStatus", CANDIDATE_STATUSES) || pick("candidateStatus", CANDIDATE_STATUSES)
    const language = text(query.language).toLowerCase()
    if (language && !LANGUAGES.includes(language)) throw bad(`language must be one of ${LANGUAGES.join(", ")}.`)

    const round = text(query.round)
    if (round && !/^\d{1,2}$/.test(round)) throw bad("round must be a round number.")
    const num = (name) => {
        const v = text(query[name])
        if (!v) return undefined
        const n = Number(v)
        if (!Number.isFinite(n) || n < 0 || n > 100) throw bad(`${name} must be between 0 and 100.`)
        return n
    }
    const scoreMin = num("scoreMin"), scoreMax = num("scoreMax")
    if (scoreMin !== undefined && scoreMax !== undefined && scoreMin > scoreMax) throw bad("scoreMin cannot exceed scoreMax.")
    const driveId = text(query.jobId) || text(query.driveId)
    if (driveId && !/^[0-9a-fA-F]{24}$/.test(driveId)) throw bad("jobId must be a valid drive id.")

    return {
        from, to,
        compare: ["previous", "true", "1"].includes(text(query.compare).toLowerCase()),
        department: text(query.department) || undefined,
        driveId: driveId || undefined,
        round: round ? Number(round) : undefined,
        candidateStatus: interviewStatus,
        aiStatus: pick("aiStatus", AI_STATUSES),
        language: language || undefined,
        experience: text(query.experience) || undefined,
        scoreMin, scoreMax,
        unsupported: UNSUPPORTED_FILTERS.filter((k) => text(query[k])),
    }
}

/** The equally long period immediately before [from, to]. */
export const previousPeriod = ({ from, to }) => {
    const span = to.getTime() - from.getTime()
    return { from: new Date(from.getTime() - span), to: new Date(from.getTime()) }
}

export const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null)

/** A metric with its change against the previous period. `null` deltas mean "nothing to compare", never 0. */
export function withDelta(current, previous) {
    if (current == null) return { value: null, previous: previous ?? null, delta: null, deltaPct: null }
    if (previous == null) return { value: current, previous: null, delta: null, deltaPct: null }
    return { value: current, previous, delta: Math.round((current - previous) * 10) / 10, deltaPct: previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10 }
}

/**
 * Funnel from ordered stages [{ key, label, count }]. Conversion is against the previous stage, overall is
 * against the first; drop-off is what did not continue. The bottleneck is the biggest drop-off.
 */
export function buildFunnel(stages) {
    const first = stages[0]?.count || 0
    const rows = stages.map((stage, i) => {
        const prior = i === 0 ? stage.count : stages[i - 1].count
        return {
            ...stage,
            conversionPct: i === 0 ? 100 : pct(stage.count, prior),
            dropOffPct: i === 0 ? 0 : (prior > 0 ? Math.round((1 - stage.count / prior) * 1000) / 10 : null),
            overallPct: pct(stage.count, first),
        }
    })
    let bottleneck = null
    for (const row of rows.slice(1)) if (row.dropOffPct != null && (bottleneck === null || row.dropOffPct > bottleneck.dropOffPct)) bottleneck = { key: row.key, dropOffPct: row.dropOffPct }
    return { stages: rows, bottleneck }
}

export const SCORE_BUCKETS = [[0, 40], [41, 60], [61, 75], [76, 90], [91, 100]]
