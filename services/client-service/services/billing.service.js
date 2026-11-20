import mongoose from "mongoose"
import Client from "../models/client.model.js"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import OrgBilling from "../models/orgBilling.model.js"
import { OaAccount, OaAssessment, OaAttempt, OaDrive, OaStudent } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import { csvEscape } from "../utils/csv.js"

/**
 * Candidate-wise billing for the platform owner.
 *
 *  Registered      a candidate added to a drive or test during the period (by HR, an upload or self-registration).
 *                  Registrations still waiting for approval, or rejected, are not candidates yet.
 *  Gave interview  the candidate finished, or was ended automatically by proctoring: the moment the platform records an
 *                  attempt as done (an AI interview's attempt date; an online test's submission).
 *  Billable        unique candidates who gave an interview during the period (or every interview round, when an
 *                  organization is set to bill per interview).
 *  Of the registered, those who have since given the interview, are still waiting, missed it (the round closed), or
 *  started and did not finish, so the funnel is always visible next to the money.
 *
 * Dates are Indian time (IST), the way the business bills.
 */

const FINISHED = ["SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"]
export const PRODUCTS = ["AI_INTERVIEW", "ONLINE_ASSESSMENT"]
const IST = "+05:30"
const KEY_RE = /^(oa:)?[a-f0-9]{24}$/i
const FALLBACK = Object.freeze({ aiRate: 0, oaRate: 0, comboRate: 0, gstPercent: 18, unit: "CANDIDATE" })

// ---------- period ----------

const todayIst = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
const dayStart = (s) => new Date(`${s}T00:00:00.000${IST}`)
const dayEnd = (s) => new Date(`${s}T23:59:59.999${IST}`)
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const monthOf = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date(date)).slice(0, 7)

export const resolvePeriod = ({ from, to } = {}) => {
    const today = todayIst()
    const start = from || `${today.slice(0, 8)}01`
    const end = to || today
    if (!DAY_RE.test(start) || !DAY_RE.test(end) || Number.isNaN(dayStart(start).getTime()) || Number.isNaN(dayEnd(end).getTime())) {
        throw new ApiError(400, "VALIDATION_ERROR", "Choose valid dates (YYYY-MM-DD).", { from: "Use a valid date.", to: "Use a valid date." })
    }
    if (start > end) throw new ApiError(400, "VALIDATION_ERROR", "The start date must not be after the end date.", { from: "Start is after the end." })
    if ((dayEnd(end) - dayStart(start)) / 86400000 > 800) throw new ApiError(400, "VALIDATION_ERROR", "Choose a period of at most about two years.", { to: "Period too long." })
    return { from: start, to: end, start: dayStart(start), end: dayEnd(end) }
}

// ---------- who is who ----------

const loadDirectory = async () => {
    const [clients, accounts] = await Promise.all([
        Client.find({}).select("name type status tenantId primaryContact createdAt").lean(),
        OaAccount.find({}).select("orgName contactName email phone tenantId status createdAt").lean(),
    ])
    const dir = new Map(); const accountKey = new Map()
    for (const c of clients) {
        // An organization is keyed by the id on its sign-in tokens, which is the Client's own id when its tenantId field is empty.
        const key = String(c.tenantId || c._id)
        dir.set(key, { key, name: c.name, kind: c.type, status: c.status, contactName: c.primaryContact?.name || "", email: c.primaryContact?.email || "", phone: c.primaryContact?.phone || "", since: c.createdAt, tenantId: key, oaAccountIds: [] })
    }
    for (const a of accounts) {
        const tid = a.tenantId ? String(a.tenantId) : null
        const key = tid || `oa:${a._id}`
        if (!dir.has(key)) dir.set(key, { key, name: a.orgName, kind: "ONLINE_ASSESSMENT", status: a.status, contactName: a.contactName || "", email: a.email || "", phone: a.phone || "", since: a.createdAt, tenantId: tid, oaAccountIds: [] })
        dir.get(key).oaAccountIds.push(String(a._id)); accountKey.set(String(a._id), key)
    }
    return { dir, accountKey }
}

const orgFor = (dir, key) => dir.get(key) || { key, name: "Unknown organization", kind: "UNKNOWN", status: "UNKNOWN", contactName: "", email: "", phone: "", since: null, tenantId: key.startsWith("oa:") ? null : key, oaAccountIds: [] }

// ---------- usage lines: one per candidate per drive/test ----------

const between = (value, from, to) => Boolean(value) && new Date(value) >= from && new Date(value) <= to

const aiLines = async ({ start, end }, scope) => {
    const has = (f) => ({ $gt: [f, null] })                                    // true only when the field exists
    const inPeriod = (f) => ({ $and: [has(f), { $gte: [f, start] }, { $lte: [f, end] }] })
    const rows = await InterviewDrive.aggregate([
        ...(scope?.tenantId ? [{ $match: { tenantId: scope.tenantId } }] : []),
        { $unwind: "$rounds" }, { $unwind: "$rounds.candidates" },
        { $match: { "rounds.candidates.demoAlwaysLive": { $ne: true } } },
        { $project: {
            tenantId: 1, title: 1, driveKind: 1,
            email: { $toLower: { $ifNull: ["$rounds.candidates.email", ""] } }, name: "$rounds.candidates.name", phone: "$rounds.candidates.phone",
            status: "$rounds.candidates.status", aiScore: "$rounds.candidates.aiScore", flags: { $ifNull: ["$rounds.candidates.malpracticeFlags", 0] },
            attempted: "$rounds.candidates.attemptedDate", agent: { $ifNull: [{ $toString: "$rounds.candidates.agentInterviewId" }, ""] },
            roundNumber: "$rounds.roundNumber",
            addedAt: { $ifNull: [{ $toDate: "$rounds.candidates._id" }, "$createdAt"] },
        } },
        { $group: {
            _id: { t: "$tenantId", d: "$_id", e: "$email" },
            driveTitle: { $first: "$title" }, driveKind: { $first: "$driveKind" }, name: { $first: "$name" }, phone: { $first: "$phone" },
            firstAddedAt: { $min: "$addedAt" },
            gaveEver: { $max: { $cond: [has("$attempted"), 1, 0] } },
            closedEver: { $max: { $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0] } },
            startedEver: { $max: { $cond: [{ $gt: [{ $strLenCP: "$agent" }, 0] }, 1, 0] } },
            interviewsInPeriod: { $sum: { $cond: [inPeriod("$attempted"), 1, 0] } },
            firstInPeriod: { $min: { $cond: [inPeriod("$attempted"), "$attempted", null] } },
            lastInPeriod: { $max: { $cond: [inPeriod("$attempted"), "$attempted", null] } },
            interviewsTotal: { $sum: { $cond: [has("$attempted"), 1, 0] } },
            bestScore: { $max: { $cond: [has("$attempted"), "$aiScore", null] } },
            flags: { $sum: "$flags" },
        } },
        { $match: { $or: [{ firstAddedAt: { $gte: start, $lte: end } }, { interviewsInPeriod: { $gt: 0 } }] } },
    ]).allowDiskUse(true)
    return rows.map((r) => ({
        key: String(r._id.t), product: "AI_INTERVIEW", sourceId: String(r._id.d), sourceTitle: r.driveTitle || "Interview drive", kind: r.driveKind || "HIRING",
        name: r.name || "", email: r._id.e, phone: r.phone || "",
        registeredAt: r.firstAddedAt, registeredInPeriod: between(r.firstAddedAt, start, end),
        interviewsInPeriod: r.interviewsInPeriod, firstInterviewAt: r.firstInPeriod, lastInterviewAt: r.lastInPeriod, interviewsTotal: r.interviewsTotal,
        outcome: r.gaveEver ? "GAVE" : r.closedEver ? "MISSED" : r.startedEver ? "STARTED_NOT_FINISHED" : "PENDING",
        score: r.interviewsTotal ? r.bestScore ?? null : null, flags: r.flags || 0,
    }))
}

const attemptDate = (a) => a.submittedAt || a.startedAt
const chunk = (list, n) => { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out }

const oaLines = async ({ start, end }, accountKey, scope) => {
    const accountIds = scope?.oaAccountIds
    if (accountIds && !accountIds.length) return []
    const accountFilter = accountIds ? { accountId: { $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)) } } : {}
    const range = { $gte: start, $lte: end }
    const [created, finished] = await Promise.all([
        OaStudent.find({ ...accountFilter, createdAt: range }).select("accountId assessmentId name email emailNormalized phone createdAt approval").lean(),
        OaAttempt.find({ ...accountFilter, status: { $in: FINISHED }, $or: [{ submittedAt: range }, { submittedAt: null, startedAt: range }] }).select("studentId").lean(),
    ])
    const have = new Set(created.map((s) => String(s._id)))
    const missing = [...new Set(finished.map((a) => String(a.studentId)))].filter((id) => !have.has(id))
    const extra = []
    for (const ids of chunk(missing, 1000)) extra.push(...await OaStudent.find({ _id: { $in: ids } }).select("accountId assessmentId name email emailNormalized phone createdAt approval").lean())
    const students = [...created, ...extra]
    if (!students.length) return []
    const attempts = []
    for (const ids of chunk(students.map((s) => s._id), 1000)) attempts.push(...await OaAttempt.find({ studentId: { $in: ids } }).select("studentId status startedAt submittedAt percent violationCount").lean())
    const byStudent = new Map(attempts.map((a) => [String(a.studentId), a]))
    const assessments = await OaAssessment.find({ _id: { $in: [...new Set(students.map((s) => String(s.assessmentId)))] } }).select("title roundNumber roundLabel driveId").lean()
    const aById = new Map(assessments.map((a) => [String(a._id), a]))
    const drives = await OaDrive.find({ _id: { $in: [...new Set(assessments.map((a) => a.driveId).filter(Boolean).map(String))] } }).select("title").lean()
    const dById = new Map(drives.map((d) => [String(d._id), d.title]))

    const lines = []
    for (const s of students) {
        const key = accountKey.get(String(s.accountId))
        if (!key || s.approval?.status === "REJECTED") continue
        const attempt = byStudent.get(String(s._id))
        const gave = Boolean(attempt) && FINISHED.includes(attempt.status)
        const when = gave ? attemptDate(attempt) : null
        const inPeriod = gave && between(when, start, end)
        const registeredInPeriod = between(s.createdAt, start, end)
        if (!registeredInPeriod && !inPeriod) continue
        const a = aById.get(String(s.assessmentId))
        const drive = a?.driveId ? dById.get(String(a.driveId)) : null
        const outcome = gave ? "GAVE" : attempt ? "STARTED_NOT_FINISHED" : s.approval?.status === "PENDING" ? "AWAITING_APPROVAL" : "PENDING"
        lines.push({
            key, product: "ONLINE_ASSESSMENT", sourceId: String(s.assessmentId), sourceTitle: `${drive || a?.title || "Online test"} · Round ${a?.roundNumber || 1}${a?.roundLabel ? ` (${a.roundLabel})` : ""}`, kind: "TEST",
            name: s.name, email: s.emailNormalized || String(s.email || "").toLowerCase(), phone: s.phone || "",
            registeredAt: s.createdAt, registeredInPeriod,
            interviewsInPeriod: inPeriod ? 1 : 0, firstInterviewAt: inPeriod ? when : null, lastInterviewAt: inPeriod ? when : null, interviewsTotal: gave ? 1 : 0,
            outcome, score: gave ? attempt.percent ?? null : null, flags: attempt?.violationCount || 0,
        })
    }
    return lines
}

const scopeFor = (dir, key) => {
    if (!key) return null
    const org = orgFor(dir, key)
    return { tenantId: org.tenantId || undefined, oaAccountIds: org.oaAccountIds, noAi: !org.tenantId }
}

const collectLines = async (period, { product, key } = {}) => {
    const { dir, accountKey } = await loadDirectory()
    const scope = scopeFor(dir, key)
    const wantAi = !product || product === "AI_INTERVIEW"
    const wantOa = !product || product === "ONLINE_ASSESSMENT"
    const [ai, oa] = await Promise.all([
        wantAi && !(scope && scope.noAi) ? aiLines(period, scope) : [],
        wantOa ? oaLines(period, accountKey, scope) : [],
    ])
    const lines = [...ai, ...oa].filter((l) => !key || l.key === key)
    if (wantAi && wantOa && ai.length && oa.length) {
        // An AI interview that a test uses as its own part (or as one of its rounds) is the other half of a combined Online test + AI interview.
        const linked = new Set()
        for (const a of await OaAssessment.find({ $or: [{ "aiPart.aiInterviewDriveId": { $nin: [null, ""] } }, { aiInterviewDriveId: { $nin: [null, ""] } }] }).select("aiPart.aiInterviewDriveId aiInterviewDriveId").lean()) {
            if (a.aiPart?.aiInterviewDriveId) linked.add(String(a.aiPart.aiInterviewDriveId))
            if (a.aiInterviewDriveId) linked.add(String(a.aiInterviewDriveId))
        }
        for (const l of lines) if (l.product === "AI_INTERVIEW" && linked.has(l.sourceId)) l.linkedToTest = true
    }
    return { dir, lines }
}

// ---------- rate cards ----------

const loadRateDocs = async () => {
    const docs = await OrgBilling.find({}).lean()
    return { byKey: new Map(docs.map((d) => [d.key, d])), defaults: docs.find((d) => d.key === "DEFAULT") || null }
}
const cardOf = (docs, key) => {
    const own = docs.byKey.get(key) || {}
    const def = docs.defaults || {}
    const pick = (field) => own[field] ?? def[field] ?? FALLBACK[field]
    return { aiRate: pick("aiRate"), oaRate: pick("oaRate"), comboRate: pick("comboRate"), gstPercent: pick("gstPercent"), unit: pick("unit"), custom: { aiRate: own.aiRate ?? null, oaRate: own.oaRate ?? null, comboRate: own.comboRate ?? null, gstPercent: own.gstPercent ?? null, unit: own.unit ?? null }, notes: own.notes || "" }
}
const round2 = (n) => Math.round(n * 100) / 100

// ---------- numbers ----------

const emptyStats = () => ({ registered: 0, gave: 0, pending: 0, missed: 0, started: 0, awaiting: 0, interviews: 0, billableCandidates: 0, billableUnits: 0, avgScore: null, flagged: 0 })

const statsOf = (lines, unit) => {
    const s = emptyStats(); const gavePeople = new Set(); let scoreSum = 0; let scored = 0
    for (const l of lines) {
        if (l.registeredInPeriod) {
            if (l.outcome === "AWAITING_APPROVAL") s.awaiting += 1
            else {
                s.registered += 1
                if (l.outcome === "GAVE") s.gave += 1
                else if (l.outcome === "MISSED") s.missed += 1
                else if (l.outcome === "STARTED_NOT_FINISHED") s.started += 1
                else s.pending += 1
            }
        }
        if (l.interviewsInPeriod > 0) {
            s.interviews += l.interviewsInPeriod; gavePeople.add(l.email)
            if (l.score !== null && l.score !== undefined) { scoreSum += l.score; scored += 1 }
            if (l.flags > 0) s.flagged += 1
        }
    }
    s.billableCandidates = gavePeople.size
    s.billableUnits = unit === "INTERVIEW" ? s.interviews : s.billableCandidates
    s.avgScore = scored ? round2(scoreSum / scored) : null
    return s
}
const pct = (a, b) => (b ? round2((a / b) * 100) : 0)

/**
 * Candidates who gave BOTH an online test and its linked AI interview in the period. When a combined rate is set they are
 * billed once at that rate instead of the AI rate plus the test rate. Returns what to take off each product's units.
 */
const comboOf = (lines, card) => {
    const none = { candidates: 0, aiUnits: 0, oaUnits: 0 }
    if (!(card.comboRate > 0)) return none
    const perPerson = (pred) => { const m = new Map(); for (const l of lines) if (l.interviewsInPeriod > 0 && pred(l)) m.set(l.email, (m.get(l.email) || 0) + l.interviewsInPeriod); return m }
    const ai = perPerson((l) => l.product === "AI_INTERVIEW" && l.linkedToTest)
    const oa = perPerson((l) => l.product === "ONLINE_ASSESSMENT")
    const both = [...ai.keys()].filter((e) => oa.has(e))
    const byInterview = card.unit === "INTERVIEW"
    return { candidates: both.length, aiUnits: both.reduce((n, e) => n + (byInterview ? ai.get(e) : 1), 0), oaUnits: both.reduce((n, e) => n + (byInterview ? oa.get(e) : 1), 0) }
}

const orgRow = (org, lines, card) => {
    const ai = statsOf(lines.filter((l) => l.product === "AI_INTERVIEW"), card.unit)
    const oa = statsOf(lines.filter((l) => l.product === "ONLINE_ASSESSMENT"), card.unit)
    const combo = comboOf(lines, card)
    const aiBilled = ai.billableUnits - combo.aiUnits; const oaBilled = oa.billableUnits - combo.oaUnits
    const comboAmount = round2(combo.candidates * card.comboRate)
    const subtotal = round2(aiBilled * card.aiRate + oaBilled * card.oaRate + comboAmount)
    const gst = round2(subtotal * card.gstPercent / 100)
    const registered = ai.registered + oa.registered; const gave = ai.gave + oa.gave
    return {
        key: org.key, name: org.name, kind: org.kind, status: org.status, contactName: org.contactName, email: org.email, phone: org.phone, since: org.since,
        ai, oa, registered, gaveOfRegistered: gave, pending: ai.pending + oa.pending, missed: ai.missed + oa.missed, startedNotFinished: ai.started + oa.started, awaitingApproval: ai.awaiting + oa.awaiting,
        conversionPercent: pct(gave, registered), interviews: ai.interviews + oa.interviews,
        billableCandidates: ai.billableCandidates + oa.billableCandidates - combo.candidates, billableUnits: aiBilled + oaBilled + combo.candidates,
        combo: { candidates: combo.candidates, rate: card.comboRate, amount: comboAmount }, aiBilledUnits: aiBilled, oaBilledUnits: oaBilled,
        unit: card.unit, aiRate: card.aiRate, oaRate: card.oaRate, comboRate: card.comboRate, gstPercent: card.gstPercent,
        amountExGst: subtotal, gstAmount: gst, total: round2(subtotal + gst),
        aiAmount: round2(aiBilled * card.aiRate), oaAmount: round2(oaBilled * card.oaRate), comboAmount,
        rateMissing: (aiBilled > 0 && !card.aiRate) || (oaBilled > 0 && !card.oaRate),
        hasCustomRate: Object.values(card.custom).some((v) => v !== null),
    }
}

const groupBy = (lines) => { const m = new Map(); for (const l of lines) { if (!m.has(l.key)) m.set(l.key, []); m.get(l.key).push(l) } return m }

/** A six-month look back: candidates billed each month (at today's rates), across every organization. */
const trendFor = async (period, dir, docs, product) => {
    const months = []
    const [y, m] = period.to.split("-").map(Number)
    for (let i = 5; i >= 0; i -= 1) { const d = new Date(Date.UTC(y, m - 1 - i, 1)); months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`) }
    const first = months[0]
    const windowStart = dayStart(`${first}-01`); const windowEnd = period.end
    const buckets = new Map()     // `${month}|${key}|${product}` -> { people:Set, interviews }
    const add = (month, key, prod, email, n) => { if (!months.includes(month)) return; const id = `${month}|${key}|${prod}`; if (!buckets.has(id)) buckets.set(id, { people: new Set(), interviews: 0 }); const b = buckets.get(id); b.people.add(email); b.interviews += n }
    if (!product || product === "AI_INTERVIEW") {
        const rows = await InterviewDrive.aggregate([
            { $unwind: "$rounds" }, { $unwind: "$rounds.candidates" },
            { $match: { "rounds.candidates.demoAlwaysLive": { $ne: true }, "rounds.candidates.attemptedDate": { $gte: windowStart, $lte: windowEnd } } },
            { $group: { _id: { t: "$tenantId", e: { $toLower: { $ifNull: ["$rounds.candidates.email", ""] } }, m: { $dateToString: { format: "%Y-%m", date: "$rounds.candidates.attemptedDate", timezone: "Asia/Kolkata" } } }, n: { $sum: 1 } } },
        ]).allowDiskUse(true)
        for (const r of rows) add(r._id.m, String(r._id.t), "AI_INTERVIEW", r._id.e, r.n)
    }
    if (!product || product === "ONLINE_ASSESSMENT") {
        const { accountKey } = await loadDirectory()
        const attempts = await OaAttempt.find({ status: { $in: FINISHED }, $or: [{ submittedAt: { $gte: windowStart, $lte: windowEnd } }, { submittedAt: null, startedAt: { $gte: windowStart, $lte: windowEnd } }] }).select("studentId accountId startedAt submittedAt").lean()
        const emails = new Map()
        for (const ids of chunk([...new Set(attempts.map((a) => String(a.studentId)))], 1000)) for (const s of await OaStudent.find({ _id: { $in: ids } }).select("emailNormalized email").lean()) emails.set(String(s._id), s.emailNormalized || String(s.email || "").toLowerCase())
        for (const a of attempts) { const key = accountKey.get(String(a.accountId)); if (key) add(monthOf(attemptDate(a)), key, "ONLINE_ASSESSMENT", emails.get(String(a.studentId)) || String(a.studentId), 1) }
    }
    return months.map((month) => {
        let candidates = 0; let interviews = 0; let amount = 0
        const perKey = new Map()
        for (const [id, b] of buckets) { const [mo, key, prod] = id.split("|"); if (mo !== month) continue; const card = cardOf(docs, key); const units = card.unit === "INTERVIEW" ? b.interviews : b.people.size; candidates += b.people.size; interviews += b.interviews; amount += units * (prod === "AI_INTERVIEW" ? card.aiRate : card.oaRate); perKey.set(key, true) }
        return { month, candidates, interviews, amountExGst: round2(amount), organizations: perKey.size }
    })
}

// ---------- public API ----------

const checkKey = (key) => { if (!KEY_RE.test(String(key || ""))) throw new ApiError(404, "NOT_FOUND", "Organization not found."); return String(key) }
const checkProduct = (product) => { if (product === undefined || product === "" || product === "ALL") return undefined; if (!PRODUCTS.includes(product)) throw new ApiError(400, "VALIDATION_ERROR", "Unknown product.", { product: "Choose All, AI Interview or Online Assessment." }); return product }

export const getSummary = async (query = {}) => {
    const period = resolvePeriod(query); const product = checkProduct(query.product)
    const docs = await loadRateDocs()
    const { dir, lines } = await collectLines(period, { product })
    const grouped = groupBy(lines)
    let organizations = [...grouped].map(([key, ls]) => orgRow(orgFor(dir, key), ls, cardOf(docs, key)))
    if (query.includeIdle === "1" || query.includeIdle === true) {
        for (const [key, org] of dir) if (!grouped.has(key) && org.status === "ACTIVE") organizations.push(orgRow(org, [], cardOf(docs, key)))
    }
    organizations.sort((a, b) => b.billableUnits - a.billableUnits || b.registered - a.registered || a.name.localeCompare(b.name))
    const sum = (f) => organizations.reduce((s, o) => s + f(o), 0)
    const totals = {
        organizations: organizations.length,
        registered: sum((o) => o.registered), gaveOfRegistered: sum((o) => o.gaveOfRegistered), pending: sum((o) => o.pending), missed: sum((o) => o.missed),
        startedNotFinished: sum((o) => o.startedNotFinished), awaitingApproval: sum((o) => o.awaitingApproval), interviews: sum((o) => o.interviews),
        billableCandidates: sum((o) => o.billableCandidates), billableUnits: sum((o) => o.billableUnits),
        amountExGst: round2(sum((o) => o.amountExGst)), gstAmount: round2(sum((o) => o.gstAmount)), total: round2(sum((o) => o.total)),
        aiAmount: round2(sum((o) => o.aiAmount)), oaAmount: round2(sum((o) => o.oaAmount)), comboAmount: round2(sum((o) => o.comboAmount)), comboCandidates: sum((o) => o.combo.candidates),
        aiBillable: sum((o) => o.ai.billableCandidates), oaBillable: sum((o) => o.oa.billableCandidates),
        ratesMissing: organizations.filter((o) => o.rateMissing).length,
    }
    totals.conversionPercent = pct(totals.gaveOfRegistered, totals.registered)
    const defaults = cardOf(docs, "DEFAULT")
    return { period: { from: period.from, to: period.to }, product: product || "ALL", totals, organizations, trend: await trendFor(period, dir, docs, product), defaults: { ...defaults.custom, unit: docs.defaults?.unit ?? FALLBACK.unit, gstPercent: docs.defaults?.gstPercent ?? FALLBACK.gstPercent, aiRate: docs.defaults?.aiRate ?? null, oaRate: docs.defaults?.oaRate ?? null, comboRate: docs.defaults?.comboRate ?? null } }
}

export const getOrganization = async (key, query = {}) => {
    checkKey(key); const period = resolvePeriod(query); const product = checkProduct(query.product)
    const docs = await loadRateDocs()
    const { dir, lines } = await collectLines(period, { product, key })
    const org = orgFor(dir, key)
    if (!dir.has(key)) throw new ApiError(404, "NOT_FOUND", "Organization not found.")
    const card = cardOf(docs, key)
    const bySource = new Map()
    for (const l of lines) { const id = `${l.product}|${l.sourceId}`; if (!bySource.has(id)) bySource.set(id, { product: l.product, sourceId: l.sourceId, title: l.sourceTitle, lines: [] }); bySource.get(id).lines.push(l) }
    const sources = [...bySource.values()].map((g) => ({ product: g.product, sourceId: g.sourceId, title: g.title, ...statsOf(g.lines, card.unit) })).sort((a, b) => b.interviews - a.interviews || b.registered - a.registered)
    return { period: { from: period.from, to: period.to }, organization: orgRow(org, lines, card), rates: { aiRate: card.aiRate, oaRate: card.oaRate, comboRate: card.comboRate, gstPercent: card.gstPercent, unit: card.unit, custom: card.custom, notes: card.notes, defaults: { aiRate: docs.defaults?.aiRate ?? null, oaRate: docs.defaults?.oaRate ?? null, comboRate: docs.defaults?.comboRate ?? null, gstPercent: docs.defaults?.gstPercent ?? FALLBACK.gstPercent, unit: docs.defaults?.unit ?? FALLBACK.unit } }, sources }
}

const annotateUnits = (lines, unit) => {
    const seen = new Set()
    const order = [...lines].sort((a, b) => new Date(a.firstInterviewAt || 8.64e15) - new Date(b.firstInterviewAt || 8.64e15))
    const units = new Map()
    for (const l of order) {
        if (unit === "INTERVIEW") { units.set(l, l.interviewsInPeriod); continue }
        const id = `${l.product}|${l.email}`
        if (l.interviewsInPeriod > 0 && !seen.has(id)) { seen.add(id); units.set(l, 1) } else units.set(l, 0)
    }
    return lines.map((l) => ({ ...l, units: units.get(l) || 0 }))
}

const OUTCOME_LABEL = { GAVE: "Gave the interview", PENDING: "Not yet", MISSED: "Missed (round closed)", STARTED_NOT_FINISHED: "Started, not finished", AWAITING_APPROVAL: "Awaiting approval" }
const PRODUCT_LABEL = { AI_INTERVIEW: "AI Interview", ONLINE_ASSESSMENT: "Online Assessment" }

const detailLines = async (key, query) => {
    checkKey(key); const period = resolvePeriod(query); const product = checkProduct(query.product)
    const docs = await loadRateDocs()
    const { dir, lines } = await collectLines(period, { product, key })
    if (!dir.has(key)) throw new ApiError(404, "NOT_FOUND", "Organization not found.")
    const card = cardOf(docs, key)
    return { period, org: orgFor(dir, key), card, lines: annotateUnits(lines, card.unit) }
}

export const listLines = async (key, query = {}) => {
    const { lines } = await detailLines(key, query)
    const term = String(query.search || "").trim().toLowerCase().slice(0, 80)
    const outcome = ["GAVE", "PENDING", "MISSED", "STARTED_NOT_FINISHED", "AWAITING_APPROVAL"].includes(query.outcome) ? query.outcome : null
    let rows = lines
    if (outcome) rows = rows.filter((l) => l.outcome === outcome)
    if (query.billable === "1") rows = rows.filter((l) => l.units > 0)
    if (term) rows = rows.filter((l) => `${l.name} ${l.email} ${l.phone} ${l.sourceTitle}`.toLowerCase().includes(term))
    rows.sort((a, b) => new Date(b.lastInterviewAt || b.registeredAt || 0) - new Date(a.lastInterviewAt || a.registeredAt || 0))
    const pageSize = [10, 25, 50, 100].includes(Number(query.pageSize)) ? Number(query.pageSize) : 25
    const page = Math.max(1, Number(query.page) || 1)
    return { items: rows.slice((page - 1) * pageSize, page * pageSize).map(lineView), total: rows.length, page, pageSize }
}

const lineView = (l) => ({
    product: l.product, source: l.sourceTitle, name: l.name, email: l.email, phone: l.phone,
    registeredAt: l.registeredAt, registeredInPeriod: l.registeredInPeriod, interviewedAt: l.lastInterviewAt, interviewsInPeriod: l.interviewsInPeriod,
    outcome: l.outcome, score: l.score, flags: l.flags, units: l.units,
})

// ---------- rate cards: read and change ----------

const numberField = (value, { max, field, label, decimals = 2 }) => {
    if (value === null || value === "" || value === undefined) return null
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0 || n > max || Math.abs(n * 10 ** decimals - Math.round(n * 10 ** decimals)) > 1e-6) {
        throw new ApiError(400, "VALIDATION_ERROR", `${label} must be a number from 0 to ${max}${decimals ? ` with at most ${decimals} decimals` : ""}.`, { [field]: `0 to ${max}` })
    }
    return n
}

export const saveRates = async (key, body = {}, actor = null) => {
    if (key !== "DEFAULT") checkKey(key)
    const update = {}
    if (body.aiRate !== undefined) update.aiRate = numberField(body.aiRate, { max: 100000, field: "aiRate", label: "The AI interview rate" })
    if (body.oaRate !== undefined) update.oaRate = numberField(body.oaRate, { max: 100000, field: "oaRate", label: "The online assessment rate" })
    if (body.comboRate !== undefined) update.comboRate = numberField(body.comboRate, { max: 100000, field: "comboRate", label: "The online test + AI interview rate" })
    if (body.gstPercent !== undefined) update.gstPercent = numberField(body.gstPercent, { max: 40, field: "gstPercent", label: "GST" })
    if (body.unit !== undefined) {
        if (body.unit !== null && body.unit !== "" && !["CANDIDATE", "INTERVIEW"].includes(body.unit)) throw new ApiError(400, "VALIDATION_ERROR", "Bill per candidate or per interview.", { unit: "Choose a billing unit." })
        update.unit = body.unit || null
    }
    if (body.notes !== undefined) {
        const notes = String(body.notes ?? "").trim()
        if (notes.length > 500) throw new ApiError(400, "VALIDATION_ERROR", "Notes can be at most 500 characters.", { notes: "At most 500 characters." })
        update.notes = notes
    }
    if (!Object.keys(update).length) throw new ApiError(400, "VALIDATION_ERROR", "Nothing to save.")
    await OrgBilling.updateOne({ key }, { $set: { ...update, updatedBy: actor ? String(actor).slice(0, 80) : null }, $setOnInsert: { key } }, { upsert: true })
    return { saved: true }
}

// ---------- exports ----------

// A cell that starts with = + - @ would be read as a formula by a spreadsheet: text from people is made safe.
const text = (v) => { const s = String(v ?? ""); return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s }
const when = (d) => (d ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "")
const KIND_LABEL = { ORGANIZATION: "Organization", COLLEGE: "College", ONLINE_ASSESSMENT: "Online Assessment only", UNKNOWN: "Unknown" }
const toCsv = (rows) => `﻿${rows.map((r) => r.map((c) => csvEscape(c)).join(",")).join("\r\n")}`

export const exportSummaryCsv = async (query = {}) => {
    const s = await getSummary(query)
    const head = ["Organization", "Type", "Status", "Contact", "Contact email", "Contact phone", "Registered", "Gave the interview", "Not yet", "Missed", "Started, not finished", "Conversion %", "Interview rounds", "AI billable", "Online test billable", "Billing unit", "Billable units", "AI rate (INR)", "Online test rate (INR)", "Online test + AI rate (INR)", "Online test + AI candidates", "Amount excl. GST (INR)", "GST %", "GST (INR)", "Total (INR)"]
    const rows = [[`Billing ${s.period.from} to ${s.period.to}`], head]
    for (const o of s.organizations) rows.push([text(o.name), KIND_LABEL[o.kind] || o.kind, o.status, text(o.contactName), text(o.email), text(o.phone), o.registered, o.gaveOfRegistered, o.pending, o.missed, o.startedNotFinished, o.conversionPercent, o.interviews, o.ai.billableCandidates, o.oa.billableCandidates, o.unit === "INTERVIEW" ? "Per interview" : "Per candidate", o.billableUnits, o.aiRate, o.oaRate, o.comboRate, o.combo.candidates, o.amountExGst, o.gstPercent, o.gstAmount, o.total])
    const t = s.totals
    rows.push(["TOTAL", "", "", "", "", "", t.registered, t.gaveOfRegistered, t.pending, t.missed, t.startedNotFinished, t.conversionPercent, t.interviews, t.aiBillable, t.oaBillable, "", t.billableUnits, "", "", t.amountExGst, "", t.gstAmount, t.total])
    return { filename: `billing-${s.period.from}-to-${s.period.to}.csv`, csv: toCsv(rows) }
}

export const exportOrganizationCsv = async (key, query = {}) => {
    const { period, org, card, lines } = await detailLines(key, query)
    const sorted = [...lines].sort((a, b) => new Date(a.registeredAt || 0) - new Date(b.registeredAt || 0))
    const head = ["#", "Product", "Drive / test", "Candidate", "Email", "Phone", "Registered on", "Interviewed on", "Interview rounds in period", "Status", "Score", "Proctoring flags", "Billing units"]
    const rows = [[`${org.name}: billing annexure ${period.from} to ${period.to}`], [`Billing unit: ${card.unit === "INTERVIEW" ? "per interview round" : "per candidate (each person once)"}. AI rate ${card.aiRate} INR, online test rate ${card.oaRate} INR, GST ${card.gstPercent}%`], head]
    sorted.forEach((l, i) => rows.push([i + 1, PRODUCT_LABEL[l.product], text(l.sourceTitle), text(l.name), text(l.email), text(l.phone), when(l.registeredAt), when(l.lastInterviewAt), l.interviewsInPeriod, OUTCOME_LABEL[l.outcome], l.score ?? "", l.flags, l.units]))
    const units = sorted.reduce((s, l) => s + l.units, 0)
    rows.push(["", "", "", "", "", "", "", "", "", "", "", "Total billing units", units])
    return { filename: `${org.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "organization"}-annexure-${period.from}-to-${period.to}.csv`, csv: toCsv(rows) }
}

// ---------- an organization's own view: what it is billed, read-only ----------

const ownKey = (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    return String(tenantId)
}

/**
 * The same figures the platform owner invoices from, for one organization only: its own usage, its own rates and the
 * candidates behind them. Never other organizations, the platform's default rate card, or the owner's private notes.
 */
export const getOwnBilling = async (tenantId, query = {}) => {
    const res = await getOrganization(ownKey(tenantId), query)
    return {
        period: res.period,
        organization: { ...res.organization, hasCustomRate: false },
        rates: { aiRate: res.rates.aiRate, oaRate: res.rates.oaRate, comboRate: res.rates.comboRate, gstPercent: res.rates.gstPercent, unit: res.rates.unit, custom: { aiRate: null, oaRate: null, comboRate: null, gstPercent: null, unit: null }, notes: "", defaults: { aiRate: null, oaRate: null, comboRate: null, gstPercent: res.rates.gstPercent, unit: res.rates.unit } },
        sources: res.sources,
    }
}
export const listOwnLines = (tenantId, query = {}) => listLines(ownKey(tenantId), query)
export const exportOwnCsv = (tenantId, query = {}) => exportOrganizationCsv(ownKey(tenantId), query)
