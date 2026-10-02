// Hiring Control Center aggregates. Everything is computed by MongoDB ($match/$group), never by loading candidate
// rows into the API process, and every query is scoped by tenantId first (the leading index key).
// A metric the platform holds no data for is returned as { available: false, reason } - never a made-up number.
import mongoose from "mongoose"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { ApiError } from "../utils/response.js"
import { LATE_GRACE_MINUTES } from "./interviewDrive.service.js"
import { SCORE_BUCKETS, buildFunnel, parseFilters, pct, previousPeriod, withDelta } from "../utils/dashboardMetrics.js"

const MINUTE = 60 * 1000
const CACHE_TTL_MS = Number(process.env.DASHBOARD_CACHE_TTL_MS || 30000)
const cache = new Map()
const cached = async (key, compute) => {
    const hit = cache.get(key)
    if (hit && hit.expires > Date.now()) return hit.value
    const value = await compute()
    cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS })
    if (cache.size > 500) cache.delete(cache.keys().next().value)      // bounded: oldest entry goes first
    return value
}

const unavailable = (reason) => ({ available: false, reason })

/** Pipeline prefix: one row per candidate, filtered. `period` bounds the candidate's activity date. */
function candidatePipeline(tenantId, f, period) {
    const driveMatch = { tenantId }
    if (f.department) driveMatch.department = f.department
    if (f.driveId) driveMatch._id = new mongoose.Types.ObjectId(f.driveId)
    const c = "$rounds.candidates"
    const match = { activityAt: { $gte: period.from, $lte: period.to } }
    if (f.candidateStatus) match.status = f.candidateStatus
    if (f.language) match.language = f.language
    if (f.experience) match.exp = f.experience
    if (f.aiStatus) match.aiStatus = f.aiStatus
    if (f.scoreMin !== undefined || f.scoreMax !== undefined) match.aiScore = { ...(f.scoreMin !== undefined && { $gte: f.scoreMin }), ...(f.scoreMax !== undefined && { $lte: f.scoreMax }) }
    return [
        { $match: driveMatch },
        { $unwind: "$rounds" },
        ...(f.round ? [{ $match: { "rounds.roundNumber": f.round } }] : []),
        { $unwind: "$rounds.candidates" },
        {
            $project: {
                _id: 0, driveId: "$_id", driveTitle: "$title", department: 1, roundNumber: "$rounds.roundNumber",
                passing: { $ifNull: ["$rounds.passingThreshold", 70] },
                status: `${c}.status`, aiScore: { $ifNull: [`${c}.aiScore`, 0] }, exp: `${c}.exp`, language: `${c}.preferredLanguage`,
                slot: `${c}.interviewSlot`, attempted: `${c}.attemptedDate`, flags: { $ifNull: [`${c}.malpracticeFlags`, 0] },
                activityAt: { $ifNull: [`${c}.attemptedDate`, { $ifNull: [`${c}.interviewSlot`, "$createdAt"] }] },
                applied: { $or: [{ $ne: [{ $ifNull: [`${c}.resumeFilename`, null] }, null] }, { $ne: [{ $ifNull: [`${c}.interviewSlot`, null] }, null] }] },
                started: { $ne: [{ $ifNull: [`${c}.agentInterviewId`, null] }, null] },
                report: `${c}.agentReport`,
                aiStatus: { $switch: { branches: [
                    { case: { $ne: [{ $ifNull: [`${c}.agentReport`, null] }, null] }, then: "COMPLETED" },
                    { case: { $ne: [{ $ifNull: [`${c}.agentInterviewId`, null] }, null] }, then: "IN_PROGRESS" },
                ], default: "NOT_STARTED" } },
            },
        },
        { $match: match },
    ]
}

const run = (tenantId, f, period, tail) => InterviewDrive.aggregate([...candidatePipeline(tenantId, f, period), ...tail]).option({ maxTimeMS: 15000 })
const one = async (...args) => (await run(...args))[0] || {}
const meta = (f) => ({ from: f.from, to: f.to, unsupportedFilters: f.unsupported, generatedAt: new Date().toISOString() })
const require_ = (tenantId) => { if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.") }

const totalsTail = [{
    $group: {
        _id: null,
        candidates: { $sum: 1 },
        applied: { $sum: { $cond: ["$applied", 1, 0] } },
        scheduled: { $sum: { $cond: [{ $ne: [{ $ifNull: ["$slot", null] }, null] }, 1, 0] } },
        aiStarted: { $sum: { $cond: ["$started", 1, 0] } },
        aiCompleted: { $sum: { $cond: [{ $eq: ["$aiStatus", "COMPLETED"] }, 1, 0] } },
        shortlisted: { $sum: { $cond: [{ $eq: ["$status", "SHORTLISTED"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
        scoredCount: { $sum: { $cond: [{ $gt: ["$aiScore", 0] }, 1, 0] } },
        scoreSum: { $sum: { $cond: [{ $gt: ["$aiScore", 0] }, "$aiScore", 0] } },
        flagged: { $sum: { $cond: [{ $gt: ["$flags", 0] }, 1, 0] } },
    },
}]

const withRates = (t, noShows = null) => ({
    candidates: t.candidates || 0, applied: t.applied || 0, scheduled: t.scheduled || 0, aiStarted: t.aiStarted || 0, aiCompleted: t.aiCompleted || 0,
    shortlisted: t.shortlisted || 0, rejected: t.rejected || 0,
    aiCompletionPct: pct(t.aiCompleted || 0, t.aiStarted || 0),
    averageScore: t.scoredCount ? Math.round(t.scoreSum / t.scoredCount) : null,
    shortlistRatePct: pct(t.shortlisted || 0, t.aiCompleted || 0),
    noShows,
})

// "No-show": a slot whose start window (slot + grace) has fully passed with no interview started.
const noShowCount = (tenantId, f, period) =>
    one(tenantId, f, period, [
        { $match: { slot: { $lt: new Date(Date.now() - LATE_GRACE_MINUTES * MINUTE) }, started: false, status: { $in: ["SCHEDULED", "INVITED"] } } },
        { $count: "n" },
    ]).then((r) => r.n || 0)

export const getSummary = async (tenantId, query) => {
    require_(tenantId)
    const f = parseFilters(query)
    return cached(`summary:${tenantId}:${JSON.stringify(query)}`, async () => {
        const period = { from: f.from, to: f.to }
        const [current, noShows, prevTotals, prevNoShows, openDrives] = await Promise.all([
            one(tenantId, f, period, totalsTail), noShowCount(tenantId, f, period),
            f.compare ? one(tenantId, f, previousPeriod(f), totalsTail) : null,
            f.compare ? noShowCount(tenantId, f, previousPeriod(f)) : null,
            InterviewDrive.countDocuments({ tenantId, status: "ACTIVE" }),
        ])
        const now = withRates(current, noShows)
        const before = prevTotals ? withRates(prevTotals, prevNoShows) : null
        const d = (key) => withDelta(now[key], before ? before[key] : null)
        return {
            filters: meta(f),
            kpis: {
                openDrives: { value: openDrives },
                candidates: d("candidates"),
                interviewsScheduled: d("scheduled"),
                aiInterviewsCompleted: d("aiCompleted"),
                aiCompletionPct: d("aiCompletionPct"),
                averageScore: d("averageScore"),
                shortlisted: d("shortlisted"),
                shortlistRatePct: d("shortlistRatePct"),
                noShowRatePct: withDelta(pct(noShows, now.scheduled), before ? pct(prevNoShows, before.scheduled) : null),
                hires: unavailable("Offers and hires are not recorded yet."),
                medianTimeToHire: unavailable("Offer and joining dates are not recorded yet."),
                offerAcceptance: unavailable("Offers are not recorded yet."),
            },
        }
    })
}

export const getFunnel = async (tenantId, query) => {
    require_(tenantId)
    const f = parseFilters(query)
    return cached(`funnel:${tenantId}:${JSON.stringify(query)}`, async () => {
        const t = withRates(await one(tenantId, f, { from: f.from, to: f.to }, totalsTail))
        const funnel = buildFunnel([
            { key: "invited", label: "Invited", count: t.candidates, filter: {} },
            { key: "applied", label: "Applied", count: t.applied, filter: { stage: "applied" } },
            { key: "scheduled", label: "Interview scheduled", count: t.scheduled, filter: { stage: "scheduled" } },
            { key: "ai_started", label: "AI interview started", count: t.aiStarted, filter: { aiStatus: "IN_PROGRESS,COMPLETED" } },
            { key: "ai_completed", label: "AI interview completed", count: t.aiCompleted, filter: { aiStatus: "COMPLETED" } },
            { key: "shortlisted", label: "Shortlisted", count: t.shortlisted, filter: { candidateStatus: "SHORTLISTED" } },
        ])
        return { filters: meta(f), ...funnel, rejected: t.rejected, notTracked: ["Human interview", "Offer", "Hired"] }
    })
}

export const getVelocity = async (tenantId, query) => {
    require_(tenantId)
    const f = parseFilters(query)
    return cached(`velocity:${tenantId}:${JSON.stringify(query)}`, async () => {
        const period = { from: f.from, to: f.to }
        // The only stage timestamps stored today: the booked slot and when the interview was attempted.
        const base = [{ $match: { slot: { $ne: null }, attempted: { $ne: null } } }, { $project: { delay: { $divide: [{ $subtract: ["$attempted", "$slot"] }, MINUTE] } } }]
        const [agg, count] = await Promise.all([
            run(tenantId, f, period, [...base, { $group: { _id: null, avg: { $avg: "$delay" }, n: { $sum: 1 } } }]),
            Promise.resolve(null),
        ])
        const n = agg[0]?.n || 0
        let median = null
        if (n > 0) {
            const mid = await run(tenantId, f, period, [...base, { $sort: { delay: 1 } }, { $skip: Math.floor((n - 1) / 2) }, { $limit: 1 }])
            median = Math.round(mid[0]?.delay ?? 0)
        }
        void count
        return {
            filters: meta(f),
            stages: [
                { key: "slot_to_start", label: "Booked slot to interview start", unit: "minutes", available: n > 0, samples: n, medianMinutes: median, averageMinutes: n ? Math.round(agg[0].avg) : null },
                { key: "screening", label: "Screening", ...unavailable("Stage entry times are not recorded yet.") },
                { key: "human_interview", label: "Human interview", ...unavailable("Human interviews are not recorded yet.") },
                { key: "feedback", label: "Feedback", ...unavailable("Feedback is not recorded yet.") },
                { key: "offer", label: "Offer", ...unavailable("Offers are not recorded yet.") },
            ],
        }
    })
}

export const getInterviewIntelligence = async (tenantId, query) => {
    require_(tenantId)
    const f = parseFilters(query)
    return cached(`intel:${tenantId}:${JSON.stringify(query)}`, async () => {
        const period = { from: f.from, to: f.to }
        const completed = [{ $match: { aiStatus: "COMPLETED" } }]
        const [totals, scores, competencies, focus, review] = await Promise.all([
            one(tenantId, f, period, totalsTail),
            run(tenantId, f, period, [...completed, { $match: { aiScore: { $gt: 0 } } }, {
                $bucket: { groupBy: "$aiScore", boundaries: [0, 41, 61, 76, 91, 101], default: "other", output: { count: { $sum: 1 } } },
            }]),
            run(tenantId, f, period, [...completed, { $project: { c: { $objectToArray: { $ifNull: ["$report.competency_scores", {}] } } } }, { $unwind: "$c" },
                { $group: { _id: "$c.k", average: { $avg: "$c.v" }, samples: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
            run(tenantId, f, period, [...completed, { $project: { d: { $ifNull: ["$report.content.hr_focus_coverage", []] } } }, { $unwind: "$d" },
                { $group: { _id: "$d.focus", priority: { $first: "$d.priority" }, interviews: { $sum: 1 }, avgScore: { $avg: "$d.score" },
                    covered: { $sum: { $cond: [{ $eq: ["$d.status", "COVERED"] }, 1, 0] } }, notAsked: { $sum: { $cond: [{ $in: ["$d.status", ["NOT_ASKED", "NOT_ANSWERED"]] }, 1, 0] } } } },
                { $sort: { interviews: -1 } }, { $limit: 25 }]),
            run(tenantId, f, period, [...completed, { $project: {
                contradictions: { $size: { $ifNull: ["$report.content.contradictions", []] } },
                unverified: { $size: { $filter: { input: { $ifNull: ["$report.content.resume_validation", []] }, cond: { $in: ["$$this.status", ["UNVERIFIED", "REVIEW_INCONSISTENCY"]] } } } },
                highUnasked: { $size: { $ifNull: ["$report.content.unasked_high_priority", []] } },
            } }, { $group: { _id: null, contradictions: { $sum: "$contradictions" }, withFlags: { $sum: { $cond: [{ $gt: ["$contradictions", 0] }, 1, 0] } },
                followUp: { $sum: { $cond: [{ $or: [{ $gt: ["$contradictions", 0] }, { $gt: ["$unverified", 0] }, { $gt: ["$highUnasked", 0] }] }, 1, 0] } } } }]),
        ])
        const t = withRates(totals)
        const byBucket = new Map(scores.map((b) => [b._id, b.count]))
        const bounds = [0, 41, 61, 76, 91]
        return {
            filters: meta(f),
            completed: t.aiCompleted, completionPct: t.aiCompletionPct, averageScore: t.averageScore,
            scoreDistribution: SCORE_BUCKETS.map(([min, max], i) => ({ bucket: `${min}-${max}`, count: byBucket.get(bounds[i]) || 0 })),
            competencyScores: competencies.map((c) => ({ competency: c._id, average: Math.round(c.average), samples: c.samples })),
            hrFocusCoverage: focus.map((x) => ({ focus: x._id, priority: x.priority, interviews: x.interviews, averageScore: x.avgScore == null ? null : Math.round(x.avgScore), coveredPct: pct(x.covered, x.interviews), notAskedCount: x.notAsked })),
            humanReview: { contradictions: review[0]?.contradictions || 0, interviewsWithContradictions: review[0]?.withFlags || 0, candidatesNeedingFollowUp: review[0]?.followUp || 0 },
            notice: "Decision support only. Flagged items need a person's review before any hiring decision.",
        }
    })
}

export const getSources = async (tenantId, query) => {
    require_(tenantId)
    const f = parseFilters(query)
    return { filters: meta(f), ...unavailable("The candidate source (referral, LinkedIn, career page...) is not recorded yet. Add it at application time to enable this view.") }
}

export const getAttention = async (tenantId, query) => {
    require_(tenantId)
    const f = parseFilters(query)
    return cached(`attention:${tenantId}:${JSON.stringify(query)}`, async () => {
        const now = Date.now()
        const tomorrow = [new Date(new Date().setHours(24, 0, 0, 0)), new Date(new Date().setHours(48, 0, 0, 0))]
        // "Attention" is about now, not the selected history window, so it uses a wide activity window.
        const period = { from: new Date(now - 731 * 86400000), to: new Date(now + 366 * 86400000) }
        const count = async (match) => (await one(tenantId, f, period, [{ $match: match }, { $count: "n" }])).n || 0
        const graceAgo = new Date(now - LATE_GRACE_MINUTES * MINUTE)
        const [waiting, tomorrowN, incomplete, highScore, noShow, flagged] = await Promise.all([
            count({ status: "SCHEDULED", slot: { $gt: new Date(now) } }),
            count({ status: "SCHEDULED", slot: { $gte: tomorrow[0], $lt: tomorrow[1] } }),
            count({ started: true, aiStatus: "IN_PROGRESS", slot: { $lt: graceAgo }, status: { $nin: ["COMPLETED", "REJECTED", "SHORTLISTED"] } }),
            count({ aiStatus: "COMPLETED", status: "COMPLETED", $expr: { $gte: ["$aiScore", "$passing"] } }),
            count({ started: false, status: { $in: ["SCHEDULED", "INVITED"] }, slot: { $lt: graceAgo } }),
            count({ flags: { $gt: 0 }, status: { $nin: ["REJECTED"] } }),
        ])
        const item = (key, label, n, filter) => ({ key, label, count: n, severity: n > 0 ? "attention" : "ok", filter })
        return {
            filters: meta(f),
            items: [
                item("waiting_interview", "candidates waiting for their interview", waiting, { candidateStatus: "SCHEDULED" }),
                item("scheduled_tomorrow", "interviews scheduled tomorrow", tomorrowN, { candidateStatus: "SCHEDULED", when: "tomorrow" }),
                item("incomplete_ai", "incomplete AI interviews", incomplete, { aiStatus: "IN_PROGRESS" }),
                item("high_score_review", "high-score candidates awaiting a decision", highScore, { candidateStatus: "COMPLETED", scoreAbove: "passing" }),
                item("no_show", "candidates who missed their slot", noShow, { stage: "no_show" }),
                item("proctoring_flags", "candidates with proctoring flags", flagged, { flagged: "true" }),
            ].filter((i) => i.count > 0 || ["waiting_interview", "high_score_review"].includes(i.key)),
        }
    })
}

export const getHiringHealth = async (tenantId, query) => {
    require_(tenantId)
    const f = parseFilters(query)
    return cached(`health:${tenantId}:${JSON.stringify(query)}`, async () => {
        const period = { from: f.from, to: f.to }
        const rows = await run(tenantId, f, period, [
            { $group: { _id: "$driveId", title: { $first: "$driveTitle" }, department: { $first: "$department" }, candidates: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ["$aiStatus", "COMPLETED"] }, 1, 0] } }, shortlisted: { $sum: { $cond: [{ $eq: ["$status", "SHORTLISTED"] }, 1, 0] } },
                scoredCount: { $sum: { $cond: [{ $gt: ["$aiScore", 0] }, 1, 0] } }, scoreSum: { $sum: { $cond: [{ $gt: ["$aiScore", 0] }, "$aiScore", 0] } },
                waiting: { $sum: { $cond: [{ $eq: ["$status", "SCHEDULED"] }, 1, 0] } } } },
            { $sort: { candidates: -1 } }, { $limit: 50 },
        ])
        const drives = await InterviewDrive.find({ tenantId, _id: { $in: rows.map((r) => r._id) } }).select("status expiryDate").lean()
        const meta_ = new Map(drives.map((d) => [String(d._id), d]))
        return {
            filters: meta(f),
            drives: rows.map((r) => {
                const d = meta_.get(String(r._id))
                const daysLeft = d?.expiryDate ? Math.ceil((new Date(d.expiryDate) - Date.now()) / 86400000) : null
                return {
                    driveId: String(r._id), title: r.title, department: r.department, status: d?.status || null,
                    candidates: r.candidates, completed: r.completed, shortlisted: r.shortlisted, waiting: r.waiting,
                    completionPct: pct(r.completed, r.candidates), averageScore: r.scoredCount ? Math.round(r.scoreSum / r.scoredCount) : null,
                    daysToExpiry: daysLeft, health: d?.status === "ACTIVE" && daysLeft !== null && daysLeft <= 3 && r.waiting > 0 ? "at_risk" : "on_track",
                }
            }),
            workload: unavailable("Recruiter assignment is not recorded yet."),
            geography: unavailable("Job location is not recorded yet."),
        }
    })
}
