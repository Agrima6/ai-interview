import mongoose from "mongoose"
import Client from "../models/client.model.js"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import OrgBilling from "../models/orgBilling.model.js"
import { OaAccount, OaAssessment, OaAttempt, OaDrive, OaStudent } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import { csvEscape } from "../utils/csv.js"
import { communicationServiceClient } from "../config/internalClients.js"

/**
 * Candidate-wise billing for the platform owner.
 *
 *  Registered      a candidate added to a drive or test during the period (by HR, an upload or self-registration).
 *                  Registrations still waiting for approval, or rejected, are not candidates yet.
 *  Invited         the invitation email was sent to the candidate (an AI interview candidate's invitedAt; an online test
 *                  student's invite.firstSentAt). THIS is the billing event: a candidate is billed once their email has gone out,
 *                  whether or not they ever sit it.
 *  Billable        unique candidates invited during the period (or every round invited, when an organization is set to bill
 *                  per round).
 *  Gave interview  the candidate finished, or was ended automatically by proctoring. Not billed on, but shown: of the
 *                  registered, those who have since given the interview, are still waiting, missed it (the round closed),
 *                  or started and did not finish, so the funnel is always visible next to the money.
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
            roundNumber: "$rounds.roundNumber", roundTitle: "$rounds.title", candidateId: "$rounds.candidates.id",
            addedAt: { $ifNull: [{ $toDate: "$rounds.candidates._id" }, "$createdAt"] },
            // The invitation email: when it was first sent, else (older records) the first round invitation logged on the candidate, else the old "last invited" time.
            inviteAt: { $min: [
                "$rounds.candidates.invitedAt",
                { $min: { $map: { input: { $filter: { input: { $ifNull: ["$rounds.candidates.communications", []] }, as: "c", cond: { $and: [{ $eq: ["$$c.purpose", "INVITATION"] }, { $eq: ["$$c.channel", "EMAIL"] }, { $ne: ["$$c.status", "FAILED"] }] } } }, as: "c", in: "$$c.sentAt" } } },
                "$rounds.candidates.lastInviteAt",
            ] },
        } },
        { $group: {
            _id: { t: "$tenantId", d: "$_id", e: "$email" },
            driveTitle: { $first: "$title" }, driveKind: { $first: "$driveKind" }, name: { $first: "$name" }, phone: { $first: "$phone" },
            firstAddedAt: { $min: "$addedAt" },
            gaveEver: { $max: { $cond: [has("$attempted"), 1, 0] } },
            closedEver: { $max: { $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0] } },
            startedEver: { $max: { $cond: [{ $gt: [{ $strLenCP: "$agent" }, 0] }, 1, 0] } },
            invitesInPeriod: { $sum: { $cond: [inPeriod("$inviteAt"), 1, 0] } },
            firstInPeriod: { $min: { $cond: [inPeriod("$inviteAt"), "$inviteAt", null] } },
            lastInPeriod: { $max: { $cond: [inPeriod("$inviteAt"), "$inviteAt", null] } },
            invitesTotal: { $sum: { $cond: [has("$inviteAt"), 1, 0] } },
            sentRounds: { $push: { $cond: [has("$inviteAt"), { round: "$roundNumber", title: "$roundTitle", at: "$inviteAt" }, "$$REMOVE"] } },
            bestScore: { $max: { $cond: [{ $and: [has("$attempted"), { $gt: [{ $ifNull: ["$aiScore", 0] }, 0] }] }, "$aiScore", null] } },
            gaveTotal: { $sum: { $cond: [has("$attempted"), 1, 0] } },
            personIds: { $addToSet: "$candidateId" },
            flags: { $sum: "$flags" },
        } },
        { $match: { $or: [{ firstAddedAt: { $gte: start, $lte: end } }, { invitesInPeriod: { $gt: 0 } }] } },
    ]).allowDiskUse(true)
    return rows.map((r) => ({
        key: String(r._id.t), product: "AI_INTERVIEW", sourceId: String(r._id.d), sourceTitle: r.driveTitle || "Interview drive", kind: r.driveKind || "HIRING",
        name: r.name || "", email: r._id.e, phone: r.phone || "",
        registeredAt: r.firstAddedAt, registeredInPeriod: between(r.firstAddedAt, start, end),
        invitesInPeriod: r.invitesInPeriod, firstInviteAt: r.firstInPeriod, lastInviteAt: r.lastInPeriod, invitesTotal: r.invitesTotal,
        invitedRounds: (r.sentRounds || []).sort((x, y) => x.round - y.round || new Date(x.at) - new Date(y.at)).map((x) => ({ round: x.round, title: x.title || `Round ${x.round}`, at: x.at, inPeriod: between(x.at, start, end) })),
        outcome: r.gaveEver ? "GAVE" : r.closedEver ? "MISSED" : r.startedEver ? "STARTED_NOT_FINISHED" : "PENDING",
        score: r.gaveTotal ? r.bestScore ?? null : null, flags: r.flags || 0, personIds: (r.personIds || []).filter(Boolean).map(String),
    }))
}

const chunk = (list, n) => { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out }

const oaLines = async ({ start, end }, accountKey, scope) => {
    const accountIds = scope?.oaAccountIds
    if (accountIds && !accountIds.length) return []
    const accountFilter = accountIds ? { accountId: { $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)) } } : {}
    const range = { $gte: start, $lte: end }
    const inviteFields = "accountId assessmentId name email emailNormalized phone createdAt approval invite"
    // Students created in the period, and students whose invitation went out in it (the billing event).
    const [created, invited] = await Promise.all([
        OaStudent.find({ ...accountFilter, createdAt: range }).select(inviteFields).lean(),
        OaStudent.find({ ...accountFilter, $or: [{ "invite.firstSentAt": range }, { "invite.firstSentAt": null, "invite.status": "SENT", "invite.sentAt": range }] }).select(inviteFields).lean(),
    ])
    const finished = []
    const have = new Set(created.map((s) => String(s._id)))
    const students = [...created, ...invited.filter((s) => !have.has(String(s._id)))]
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
        // The invitation email: first send, or (older records) the send time of one marked SENT.
        const invitedAt = s.invite?.firstSentAt || (s.invite?.status === "SENT" ? s.invite.sentAt : null) || null
        const inPeriod = Boolean(invitedAt) && between(invitedAt, start, end)
        const registeredInPeriod = between(s.createdAt, start, end)
        if (!registeredInPeriod && !inPeriod) continue
        const a = aById.get(String(s.assessmentId))
        const drive = a?.driveId ? dById.get(String(a.driveId)) : null
        const outcome = gave ? "GAVE" : attempt ? "STARTED_NOT_FINISHED" : s.approval?.status === "PENDING" ? "AWAITING_APPROVAL" : "PENDING"
        lines.push({
            key, product: "ONLINE_ASSESSMENT", sourceId: String(s.assessmentId), groupKey: a?.driveId ? `OA|drv:${a.driveId}` : null, groupTitle: drive || null, sourceTitle: `${drive || a?.title || "Online test"} · Round ${a?.roundNumber || 1}${a?.roundLabel ? ` (${a.roundLabel})` : ""}`, kind: "TEST",
            name: s.name, email: s.emailNormalized || String(s.email || "").toLowerCase(), phone: s.phone || "",
            registeredAt: s.createdAt, registeredInPeriod,
            invitesInPeriod: inPeriod ? 1 : 0, firstInviteAt: inPeriod ? invitedAt : null, lastInviteAt: inPeriod ? invitedAt : null, invitesTotal: invitedAt ? 1 : 0,
            invitedRounds: invitedAt ? [{ round: a?.roundNumber || 1, title: a?.roundLabel || `Round ${a?.roundNumber || 1}`, at: invitedAt, inPeriod }] : [],
            outcome, score: gave ? attempt.percent ?? null : null, flags: attempt?.violationCount || 0, personIds: [String(s._id)], attemptId: attempt ? String(attempt._id) : null,
        })
    }
    return lines
}

const scopeFor = (dir, key) => {
    if (!key) return null
    const org = orgFor(dir, key)
    return { tenantId: org.tenantId || undefined, oaAccountIds: org.oaAccountIds, noAi: !org.tenantId }
}

/**
 * Combined drives: an online test and the AI interview it leads into, so billing can show them as ONE drive with two parts.
 * A multi-round drive whose rounds include both tests and AI interviews is one; so is a test with an AI part of its own.
 */
const loadPackages = async () => {
    const byAssessment = new Map(); const byAiDrive = new Map()
    const rounds = await OaAssessment.find({ status: { $ne: "ARCHIVED" } }).select("title driveId kind aiInterviewDriveId aiPart.enabled aiPart.aiInterviewDriveId").lean()
    const driveTitles = new Map((await OaDrive.find({ _id: { $in: [...new Set(rounds.map((r) => r.driveId).filter(Boolean).map(String))] } }).select("title").lean()).map((d) => [String(d._id), d.title]))
    const groups = new Map()
    for (const r of rounds) {
        const id = r.driveId ? `drv:${r.driveId}` : `asm:${r._id}`
        if (!groups.has(id)) groups.set(id, { key: id, title: r.driveId ? driveTitles.get(String(r.driveId)) || r.title : r.title, tests: [], ai: new Set() })
        const g = groups.get(id)
        const aiId = r.kind === "AI_INTERVIEW" ? r.aiInterviewDriveId : r.aiPart?.enabled ? r.aiPart.aiInterviewDriveId : null
        // A drive with an AI round is a combined drive even before that AI interview has been created and attached.
        if (r.kind === "AI_INTERVIEW" || r.aiPart?.enabled) g.hasAi = true
        if (aiId) g.ai.add(String(aiId))
        if (r.kind !== "AI_INTERVIEW") g.tests.push(String(r._id))
    }
    for (const g of groups.values()) {
        if (!g.hasAi || !g.tests.length) continue
        for (const id of g.tests) byAssessment.set(id, g)
        for (const id of g.ai) byAiDrive.set(id, g)
    }
    return { byAssessment, byAiDrive }
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
    if (ai.length || oa.length) {
        // An AI interview that a test uses (as its own part, or as a round of the same drive) belongs to ONE combined drive with it.
        const { byAssessment, byAiDrive } = await loadPackages()
        for (const l of lines) {
            const pkg = l.product === "AI_INTERVIEW" ? byAiDrive.get(l.sourceId) : byAssessment.get(l.sourceId)
            if (!pkg) continue
            l.packageKey = pkg.key; l.packageTitle = pkg.title; l.part = l.product === "AI_INTERVIEW" ? "AI interview" : "Online test"
            if (l.product === "AI_INTERVIEW") l.linkedToTest = true
        }
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

const emptyStats = () => ({ registered: 0, gave: 0, pending: 0, missed: 0, started: 0, awaiting: 0, invites: 0, billableCandidates: 0, billableUnits: 0, avgScore: null, flagged: 0 })

const statsOf = (lines, unit) => {
    const s = emptyStats(); const invitedPeople = new Set(); let scoreSum = 0; let scored = 0
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
        if (l.invitesInPeriod > 0) {
            s.invites += l.invitesInPeriod; invitedPeople.add(l.email)
            if (l.score !== null && l.score !== undefined) { scoreSum += l.score; scored += 1 }
            if (l.flags > 0) s.flagged += 1
        }
    }
    s.billableCandidates = invitedPeople.size
    s.billableUnits = unit === "INTERVIEW" ? s.invites : s.billableCandidates
    s.avgScore = scored ? round2(scoreSum / scored) : null
    return s
}
const pct = (a, b) => (b ? round2((a / b) * 100) : 0)

/**
 * What each client has actually CREATED, so billing shows (and prices) only that: an online test on its own, an AI interview
 * on its own, or an online test together with an AI interview. key -> { oa, ai, combo }.
 */
const loadUsage = async (dir) => {
    const accountKey = new Map()
    for (const [key, org] of dir) for (const id of org.oaAccountIds || []) accountKey.set(String(id), key)
    const uses = new Map()
    const mark = (key, what) => { if (!key) return; if (!uses.has(key)) uses.set(key, { oa: false, ai: false, combo: false }); uses.get(key)[what] = true }
    const assessments = await OaAssessment.find({ status: { $ne: "ARCHIVED" } }).select("accountId driveId kind aiPart.enabled aiPart.aiInterviewDriveId aiInterviewDriveId").lean()
    const testDrives = new Set(assessments.filter((a) => a.kind !== "AI_INTERVIEW" && a.driveId).map((a) => `${a.accountId}|${a.driveId}`))
    const aiRoundDrives = new Set(assessments.filter((a) => a.kind === "AI_INTERVIEW" && a.driveId).map((a) => `${a.accountId}|${a.driveId}`))
    const linked = new Set()
    for (const a of assessments) {
        const key = accountKey.get(String(a.accountId))
        const partId = a.aiPart?.enabled ? a.aiPart.aiInterviewDriveId : null
        if (a.kind === "AI_INTERVIEW") {
            if (a.aiInterviewDriveId) linked.add(String(a.aiInterviewDriveId))
            // an AI round inside a drive that also has online-test rounds is the second half of a combined drive
            mark(key, a.driveId && testDrives.has(`${a.accountId}|${a.driveId}`) ? "combo" : "ai")
        } else if (partId) { linked.add(String(partId)); mark(key, "combo") }
        else mark(key, a.driveId && aiRoundDrives.has(`${a.accountId}|${a.driveId}`) ? "combo" : "oa")
    }
    for (const d of await InterviewDrive.find({}).select("tenantId").lean()) if (!linked.has(String(d._id))) mark(String(d.tenantId), "ai")
    return uses
}

/**
 * Candidates who gave BOTH an online test and its linked AI interview in the period. When a combined rate is set they are
 * billed once at that rate instead of the AI rate plus the test rate. Returns what to take off each product's units.
 */
const comboOf = (lines, card, uses, aiStats, oaStats) => {
    const none = { candidates: 0, aiUnits: 0, oaUnits: 0 }
    // A client that only ever created combined drives is sold ONE package: everyone who gave any part of it is billed the package price once.
    if (uses && uses.combo && !uses.oa && !uses.ai) {
        const people = new Set(lines.filter((l) => l.invitesInPeriod > 0).map((l) => l.email))
        return { candidates: people.size, aiUnits: aiStats.billableUnits, oaUnits: oaStats.billableUnits }
    }
    if (!(card.comboRate > 0)) return none
    // Invited to any part of a combined drive (a test, or its AI interview): one combined price, from the first invitation.
    const inPackage = lines.filter((l) => l.packageKey && l.invitesInPeriod > 0)
    const perPerson = (product) => { const m = new Map(); for (const l of inPackage) if (l.product === product) m.set(l.email, (m.get(l.email) || 0) + l.invitesInPeriod); return m }
    const ai = perPerson("AI_INTERVIEW")
    const oa = perPerson("ONLINE_ASSESSMENT")
    const people = [...new Set(inPackage.map((l) => l.email))]
    const byInterview = card.unit === "INTERVIEW"
    const units = (m, e) => (m.has(e) ? (byInterview ? m.get(e) : 1) : 0)
    return { candidates: people.length, aiUnits: people.reduce((n, e) => n + units(ai, e), 0), oaUnits: people.reduce((n, e) => n + units(oa, e), 0) }
}

// Which kinds of drive to show for a client. Anything that was billed is always shown, whatever the drive list says.
const usesOf = (uses, ai, oa, combo) => {
    const u = uses || { oa: false, ai: false, combo: false }
    if (u.combo && !u.oa && !u.ai) return { oa: false, ai: false, combo: true }      // created only combined drives: that is all there is to price
    return { oa: u.oa || (!combo.candidates && oa.billableUnits > 0), ai: u.ai || (!combo.candidates && ai.billableUnits > 0), combo: u.combo || combo.candidates > 0 }
}

const orgRow = (org, lines, card, uses = null) => {
    const ai = statsOf(lines.filter((l) => l.product === "AI_INTERVIEW"), card.unit)
    const oa = statsOf(lines.filter((l) => l.product === "ONLINE_ASSESSMENT"), card.unit)
    const combo = comboOf(lines, card, uses, ai, oa)
    const aiBilled = ai.billableUnits - combo.aiUnits; const oaBilled = oa.billableUnits - combo.oaUnits
    const comboAmount = round2(combo.candidates * card.comboRate)
    const subtotal = round2(aiBilled * card.aiRate + oaBilled * card.oaRate + comboAmount)
    const gst = round2(subtotal * card.gstPercent / 100)
    const registered = ai.registered + oa.registered; const gave = ai.gave + oa.gave
    return {
        key: org.key, name: org.name, kind: org.kind, status: org.status, contactName: org.contactName, email: org.email, phone: org.phone, since: org.since,
        ai, oa, registered, gaveOfRegistered: gave, pending: ai.pending + oa.pending, missed: ai.missed + oa.missed, startedNotFinished: ai.started + oa.started, awaitingApproval: ai.awaiting + oa.awaiting,
        conversionPercent: pct(gave, registered), invites: ai.invites + oa.invites,
        billableCandidates: new Set(lines.filter((l) => l.invitesInPeriod > 0).map((l) => l.email)).size, billableUnits: aiBilled + oaBilled + combo.candidates,
        combo: { candidates: combo.candidates, rate: card.comboRate, amount: comboAmount },
        uses: usesOf(uses, ai, oa, combo), aiBilledUnits: aiBilled, oaBilledUnits: oaBilled,
        unit: card.unit, aiRate: card.aiRate, oaRate: card.oaRate, comboRate: card.comboRate, gstPercent: card.gstPercent,
        amountExGst: subtotal, gstAmount: gst, total: round2(subtotal + gst),
        aiAmount: round2(aiBilled * card.aiRate), oaAmount: round2(oaBilled * card.oaRate), comboAmount,
        rateMissing: (aiBilled > 0 && !card.aiRate) || (oaBilled > 0 && !card.oaRate) || (combo.candidates > 0 && !card.comboRate),
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
    const buckets = new Map()     // `${month}|${key}|${product}` -> { people:Set, invites }
    const add = (month, key, prod, email, n) => { if (!months.includes(month)) return; const id = `${month}|${key}|${prod}`; if (!buckets.has(id)) buckets.set(id, { people: new Set(), invites: 0 }); const b = buckets.get(id); b.people.add(email); b.invites += n }
    if (!product || product === "AI_INTERVIEW") {
        const inviteAt = { $min: ["$rounds.candidates.invitedAt", { $min: { $map: { input: { $filter: { input: { $ifNull: ["$rounds.candidates.communications", []] }, as: "c", cond: { $and: [{ $eq: ["$$c.purpose", "INVITATION"] }, { $eq: ["$$c.channel", "EMAIL"] }, { $ne: ["$$c.status", "FAILED"] }] } } }, as: "c", in: "$$c.sentAt" } } }, "$rounds.candidates.lastInviteAt"] }
        const rows = await InterviewDrive.aggregate([
            { $unwind: "$rounds" }, { $unwind: "$rounds.candidates" },
            { $match: { "rounds.candidates.demoAlwaysLive": { $ne: true } } },
            { $addFields: { inviteAt } },
            { $match: { inviteAt: { $gte: windowStart, $lte: windowEnd } } },
            { $group: { _id: { t: "$tenantId", e: { $toLower: { $ifNull: ["$rounds.candidates.email", ""] } }, m: { $dateToString: { format: "%Y-%m", date: "$inviteAt", timezone: "Asia/Kolkata" } } }, n: { $sum: 1 } } },
        ]).allowDiskUse(true)
        for (const r of rows) add(r._id.m, String(r._id.t), "AI_INTERVIEW", r._id.e, r.n)
    }
    if (!product || product === "ONLINE_ASSESSMENT") {
        const { accountKey } = await loadDirectory()
        const range = { $gte: windowStart, $lte: windowEnd }
        const students = await OaStudent.find({ $or: [{ "invite.firstSentAt": range }, { "invite.firstSentAt": null, "invite.status": "SENT", "invite.sentAt": range }] }).select("accountId emailNormalized email invite").lean()
        for (const st of students) { const key = accountKey.get(String(st.accountId)); const at = st.invite?.firstSentAt || st.invite?.sentAt; if (key && at) add(monthOf(at), key, "ONLINE_ASSESSMENT", st.emailNormalized || String(st.email || "").toLowerCase(), 1) }
    }
    return months.map((month) => {
        let candidates = 0; let invites = 0; let amount = 0
        const perKey = new Map()
        for (const [id, b] of buckets) { const [mo, key, prod] = id.split("|"); if (mo !== month) continue; const card = cardOf(docs, key); const units = card.unit === "INTERVIEW" ? b.invites : b.people.size; candidates += b.people.size; invites += b.invites; amount += units * (prod === "AI_INTERVIEW" ? card.aiRate : card.oaRate); perKey.set(key, true) }
        return { month, candidates, invites, amountExGst: round2(amount), organizations: perKey.size }
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
    const usage = await loadUsage(dir)
    let organizations = [...grouped].map(([key, ls]) => orgRow(orgFor(dir, key), ls, cardOf(docs, key), usage.get(key)))
    if (query.includeIdle === "1" || query.includeIdle === true) {
        for (const [key, org] of dir) if (!grouped.has(key) && org.status === "ACTIVE") organizations.push(orgRow(org, [], cardOf(docs, key), usage.get(key)))
    }
    organizations.sort((a, b) => b.billableUnits - a.billableUnits || b.registered - a.registered || a.name.localeCompare(b.name))
    const sum = (f) => organizations.reduce((s, o) => s + f(o), 0)
    const totals = {
        organizations: organizations.length,
        registered: sum((o) => o.registered), gaveOfRegistered: sum((o) => o.gaveOfRegistered), pending: sum((o) => o.pending), missed: sum((o) => o.missed),
        startedNotFinished: sum((o) => o.startedNotFinished), awaitingApproval: sum((o) => o.awaitingApproval), invites: sum((o) => o.invites),
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


/**
 * One row per drive (a combined test + AI drive is one), with what it costs and the rounds inside it. A drive's amount is what
 * the invoice grows by when the drive's candidates are added, in order of first invitation: so the drives always add up to the
 * invoice exactly, even where a person is billed once across several drives or a combined rate applies.
 */
const driveBreakdown = (org, lines, card, uses) => {
    const bySource = new Map()
    for (const l of lines) { const id = l.packageKey || l.groupKey || `${l.product}|${l.sourceId}`; if (!bySource.has(id)) bySource.set(id, { product: l.packageKey ? "PACKAGE" : l.product, sourceId: l.packageKey || l.groupKey || l.sourceId, title: l.packageTitle || l.groupTitle || l.sourceTitle, lines: [] }); bySource.get(id).lines.push(l) }
    const firstInvite = (g) => g.lines.reduce((min, l) => (l.firstInviteAt && new Date(l.firstInviteAt) < min ? new Date(l.firstInviteAt) : min), new Date(8.64e15))
    const ordered = [...bySource.values()].sort((a, b) => firstInvite(a) - firstInvite(b))
    const seen = []
    let before = 0
    const out = []
    for (const g of ordered) {
        seen.push(...g.lines)
        const total = orgRow(org, seen, card, uses).amountExGst
        const stats = statsOf(mergeByPerson(g.lines), card.unit)
        // The rounds: how many invitations went out in each (by person, so a combined drive's two parts do not double count).
        const rounds = new Map()
        for (const l of g.lines) for (const r of l.invitedRounds || []) {
            if (!r.inPeriod) continue
            if (!rounds.has(r.round)) rounds.set(r.round, { round: r.round, title: r.title, invites: 0, people: new Set() })
            const entry = rounds.get(r.round); entry.invites += 1; entry.people.add(l.email)
        }
        const roundRows = [...rounds.values()].sort((a, b) => a.round - b.round).map((r) => ({
            round: r.round, title: r.title, invites: r.invites, candidates: r.people.size,
            // Only when billed per round does a round have its own price; otherwise the candidate is billed once for the drive.
            amountExGst: card.unit === "INTERVIEW" && g.product !== "PACKAGE" ? round2(r.invites * (g.product === "AI_INTERVIEW" ? card.aiRate : card.oaRate)) : null,
        }))
        out.push({ product: g.product, sourceId: g.sourceId, title: g.title, ...stats, amountExGst: round2(total - before), rounds: roundRows })
        before = total
    }
    return out.sort((a, b) => b.amountExGst - a.amountExGst || b.invites - a.invites || b.registered - a.registered)
}

export const getOrganization = async (key, query = {}) => {
    checkKey(key); const period = resolvePeriod(query); const product = checkProduct(query.product)
    const docs = await loadRateDocs()
    const { dir, lines } = await collectLines(period, { product, key })
    const org = orgFor(dir, key)
    if (!dir.has(key)) throw new ApiError(404, "NOT_FOUND", "Organization not found.")
    const card = cardOf(docs, key)
    const usage = await loadUsage(dir)
    const sources = driveBreakdown(org, lines, card, usage.get(key))
    // When the invitations went out, by day (Indian time), so "62 candidates" can be read as "when".
    const perDay = new Map()
    const dayOf = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(d))
    for (const l of lines) for (const r of l.invitedRounds || []) if (r.inPeriod) { const day = dayOf(r.at); perDay.set(day, (perDay.get(day) || 0) + 1) }
    const emailsByDay = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }))
    return { period: { from: period.from, to: period.to }, organization: orgRow(org, lines, card, usage.get(key)), rates: { aiRate: card.aiRate, oaRate: card.oaRate, comboRate: card.comboRate, gstPercent: card.gstPercent, unit: card.unit, custom: card.custom, notes: card.notes, defaults: { aiRate: docs.defaults?.aiRate ?? null, oaRate: docs.defaults?.oaRate ?? null, comboRate: docs.defaults?.comboRate ?? null, gstPercent: docs.defaults?.gstPercent ?? FALLBACK.gstPercent, unit: docs.defaults?.unit ?? FALLBACK.unit } }, sources, emailsByDay }
}

// One entry per person for a combined drive: they registered once and gave the drive once, whichever part they have reached.
const OUTCOME_RANK = ["GAVE", "STARTED_NOT_FINISHED", "MISSED", "AWAITING_APPROVAL", "PENDING"]
const mergeByPerson = (lines) => {
    const people = new Map()
    for (const l of lines) {
        const p = people.get(l.email)
        if (!p) { people.set(l.email, { ...l }); continue }
        p.registeredInPeriod = p.registeredInPeriod || l.registeredInPeriod
        p.invitesInPeriod += l.invitesInPeriod
        p.invitedRounds = [...(p.invitedRounds || []), ...(l.invitedRounds || [])]
        p.personIds = [...(p.personIds || []), ...(l.personIds || [])]
        if (OUTCOME_RANK.indexOf(l.outcome) < OUTCOME_RANK.indexOf(p.outcome)) p.outcome = l.outcome
        if (l.score !== null && l.score !== undefined) p.score = Math.max(p.score ?? 0, l.score)
    }
    return [...people.values()]
}

const annotateUnits = (lines, unit) => {
    const seen = new Set()
    const order = [...lines].sort((a, b) => new Date(a.firstInviteAt || 8.64e15) - new Date(b.firstInviteAt || 8.64e15))
    const units = new Map()
    for (const l of order) {
        if (unit === "INTERVIEW") { units.set(l, l.invitesInPeriod); continue }
        const id = `${l.packageKey || l.product}|${l.email}`        // a combined drive bills a person once, not once per part
        if (l.invitesInPeriod > 0 && !seen.has(id)) { seen.add(id); units.set(l, 1) } else units.set(l, 0)
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
    const uses = (await loadUsage(dir)).get(key)
    return { period, org: orgFor(dir, key), card, uses, lines: annotateUnits(lines, card.unit) }
}

const MAIL_BATCH = 400

/**
 * Whether each line's invitation email went out and was opened, read from the communication service. A mail outage never breaks
 * billing: the lines just carry mail: null and the page shows a dash.
 */
const attachMail = async (lines) => {
    const driveIds = [...new Set(lines.filter((l) => l.product === "AI_INTERVIEW").map((l) => l.sourceId))]
    const assessmentIds = [...new Set(lines.filter((l) => l.product === "ONLINE_ASSESSMENT").map((l) => l.sourceId))]
    const rows = []
    try {
        for (let i = 0; i < Math.max(Math.ceil(driveIds.length / MAIL_BATCH), Math.ceil(assessmentIds.length / MAIL_BATCH), 1); i += 1) {
            const batch = { driveIds: driveIds.slice(i * MAIL_BATCH, (i + 1) * MAIL_BATCH), assessmentIds: assessmentIds.slice(i * MAIL_BATCH, (i + 1) * MAIL_BATCH) }
            if (!batch.driveIds.length && !batch.assessmentIds.length) break
            rows.push(...((await communicationServiceClient.getInviteStatuses(batch)) || []))
        }
    } catch (error) {
        console.error("[client-service] billing: invite status lookup failed:", error.message)
        return lines.map((l) => ({ ...l, mail: null }))
    }
    const byKey = new Map()
    for (const r of rows) { const k = `${r.sourceId}|${r.personId}`; byKey.set(k, [...(byKey.get(k) || []), r]) }
    return lines.map((l) => {
        const mine = (l.personIds || []).flatMap((id) => byKey.get(`${l.sourceId}|${id}`) || [])
        if (!mine.length) return { ...l, mail: null }
        const newest = [...mine].sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0))[0]
        const opened = mine.map((m) => m.openedAt).filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0] || null
        return { ...l, mail: { status: opened ? "OPENED" : newest.status, sentAt: newest.sentAt || null, openedAt: opened } }
    })
}

/**
 * AI interviews that are finished but have no score stored yet: their reports are ready on the interviewer service minutes after the
 * interview, and are fetched here (bounded, best-effort), so the scorecard shows real scores instead of "pending".
 */
const withFreshAiReports = async (key, query, data) => {
    const stale = [...new Set(data.lines.filter((l) => l.product === "AI_INTERVIEW" && l.outcome === "GAVE" && (l.score === null || l.score === undefined)).map((l) => l.sourceId))]
    if (!stale.length) return data
    try {
        const { refreshDriveReports } = await import("./interviewDrive.service.js")
        await Promise.race([Promise.all(stale.slice(0, 20).map((id) => refreshDriveReports(id, { all: true }))), new Promise((resolve) => setTimeout(resolve, 20000))])
    } catch (error) { console.warn("[client-service] billing: could not refresh AI reports:", error.message); return data }
    return detailLines(key, query)
}

export const listLines = async (key, query = {}) => {
    const { lines, org, card, uses } = await withFreshAiReports(key, query, await detailLines(key, query))
    const term = String(query.search || "").trim().toLowerCase().slice(0, 80)
    const outcome = ["GAVE", "PENDING", "MISSED", "STARTED_NOT_FINISHED", "AWAITING_APPROVAL"].includes(query.outcome) ? query.outcome : null
    let rows = lines
    if (outcome) rows = rows.filter((l) => l.outcome === outcome)
    if (query.billable === "1") rows = rows.filter((l) => l.units > 0)
    if (term) rows = rows.filter((l) => `${l.name} ${l.email} ${l.phone} ${l.sourceTitle} ${l.packageTitle || ""}`.toLowerCase().includes(term))
    const latest = new Map()
    for (const l of rows) { const t = new Date(l.lastInviteAt || l.registeredAt || 0).getTime(); latest.set(l.email, Math.max(latest.get(l.email) || 0, t)) }
    const partOrder = (l) => (l.part === "AI interview" ? 1 : 0)
    // newest person first; each person's parts stay together, the test before the AI interview
    rows.sort((a, b) => latest.get(b.email) - latest.get(a.email) || a.email.localeCompare(b.email) || partOrder(a) - partOrder(b))
    const pageSize = [10, 25, 50, 100].includes(Number(query.pageSize)) ? Number(query.pageSize) : 25
    const page = Math.max(1, Number(query.page) || 1)
    if (query.view === "people") {
        // One row per person, with every drive or test they were invited to underneath it, and what that person adds to the invoice.
        const people = new Map()
        for (const l of rows) {
            const id = String(l.email || "").toLowerCase()
            if (!people.has(id)) people.set(id, { name: l.name, email: l.email, phone: l.phone, lastAt: null, units: 0, lines: [] })
            const p = people.get(id)
            p.lines.push(l); p.units += l.units || 0
            const t = l.lastInviteAt || l.registeredAt
            if (t && (!p.lastAt || new Date(t) > new Date(p.lastAt))) p.lastAt = t
        }
        // Everyone's email status is needed to filter and sort by it, so it is read for the whole list (one call per few hundred drives).
        const withMail = await attachMail([...people.values()].flatMap((p) => p.lines))
        const mailOf = new Map(withMail.map((l) => [`${l.sourceId}|${l.email}`, l.mail]))
        const scored = [...people.values()].map((p) => {
            const lines = p.lines.map((l) => ({ ...l, mail: mailOf.get(`${l.sourceId}|${l.email}`) ?? null }))
            return { ...p, lines, ...personSummary(lines), amountExGst: orgRow(org, lines, card, uses).amountExGst }
        })
        const summary = peopleSummary(scored)

        let list = scored
        const MAIL_FILTERS = { OPENED: (m) => m === "OPENED", NOT_OPENED: (m) => ["SENT", "DELIVERED", "QUEUED"].includes(m), FAILED: (m) => m === "FAILED", NOT_EMAILED: (m) => m === "NONE", EMAILED: (m) => m !== "NONE" }
        if (MAIL_FILTERS[query.mail]) list = list.filter((p) => MAIL_FILTERS[query.mail](p.mailStatus))
        if (query.test === "GAVE") list = list.filter((p) => p.testStatus === "GAVE")
        if (query.test === "NOT_YET") list = list.filter((p) => ["NOT_YET", "STARTED", "MISSED"].includes(p.testStatus))
        if (query.ai === "GAVE") list = list.filter((p) => p.aiStatus === "GAVE")
        if (query.ai === "NOT_YET") list = list.filter((p) => ["NOT_YET", "STARTED", "MISSED"].includes(p.aiStatus))

        const dir = query.order === "asc" ? 1 : -1
        const KEYS = { recent: (p) => new Date(p.lastAt || 0).getTime(), name: (p) => String(p.name || "").toLowerCase(), testScore: (p) => p.testScore, aiScore: (p) => p.aiScore, emails: (p) => p.emails, amount: (p) => p.amountExGst, invited: (p) => (p.invitedAt ? new Date(p.invitedAt).getTime() : null) }
        const key = KEYS[query.sortBy] || KEYS.recent
        list = [...list].sort((a, b) => {
            const av = key(a); const bv = key(b)
            if (av === null || av === undefined) return bv === null || bv === undefined ? String(a.name).localeCompare(String(b.name)) : 1     // blanks always last
            if (bv === null || bv === undefined) return -1
            return (typeof av === "string" ? av.localeCompare(bv) : av - bv) * dir || String(a.name).localeCompare(String(b.name))
        })
        const items = list.slice((page - 1) * pageSize, page * pageSize).map((p) => ({
            name: p.name, email: p.email, phone: p.phone, lastAt: p.lastAt, units: p.units, amountExGst: p.amountExGst,
            testScore: p.testScore, testStatus: p.testStatus, aiScore: p.aiScore, aiStatus: p.aiStatus, mailStatus: p.mailStatus, openedAt: p.openedAt, emails: p.emails, invitedAt: p.invitedAt,
            items: p.lines.map(lineView),
        }))
        return { items, total: list.length, page, pageSize, summary }
    }
    const pageLines = rows.slice((page - 1) * pageSize, page * pageSize)
    return { items: (await attachMail(pageLines)).map(lineView), total: rows.length, page, pageSize }
}

// ---------- a person's scorecard ----------

const gaveStatus = (ls) => (!ls.length ? "NONE" : ls.some((l) => l.outcome === "GAVE") ? "GAVE" : ls.some((l) => l.outcome === "STARTED_NOT_FINISHED") ? "STARTED" : ls.some((l) => l.outcome === "MISSED") ? "MISSED" : "NOT_YET")
const bestScore = (ls) => { const v = ls.map((l) => l.score).filter((x) => x !== null && x !== undefined); return v.length ? Math.max(...v) : null }

/** What one candidate looks like at a glance: test score, AI interview score, and what happened to their invitation email. */
const personSummary = (lines) => {
    const test = lines.filter((l) => l.product === "ONLINE_ASSESSMENT"); const ai = lines.filter((l) => l.product === "AI_INTERVIEW")
    const invited = lines.filter((l) => l.invitesInPeriod > 0)
    const opened = invited.map((l) => l.mail?.openedAt).filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0] || null
    const newest = [...invited].sort((a, b) => new Date(b.mail?.sentAt || 0) - new Date(a.mail?.sentAt || 0))[0]
    const first = invited.map((l) => l.firstInviteAt).filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0] || null
    // Invited and nothing known about the email (older records, or the mail service unreachable) reads as "sent".
    const mailStatus = !invited.length ? "NONE" : opened ? "OPENED" : invited.some((l) => l.mail?.status === "FAILED") && !invited.some((l) => l.mail && l.mail.status !== "FAILED") ? "FAILED" : newest?.mail?.status === "QUEUED" ? "QUEUED" : "SENT"
    return { testStatus: gaveStatus(test), testScore: bestScore(test.filter((l) => l.outcome === "GAVE")), aiStatus: gaveStatus(ai), aiScore: bestScore(ai.filter((l) => l.outcome === "GAVE")), mailStatus, openedAt: opened, emails: invited.reduce((n, l) => n + l.invitesInPeriod, 0), invitedAt: first }
}

const peopleSummary = (people) => {
    const avg = (xs) => (xs.length ? round2(xs.reduce((s, x) => s + x, 0) / xs.length) : null)
    return {
        people: people.length,
        emailed: people.filter((p) => p.mailStatus !== "NONE").length,
        opened: people.filter((p) => p.mailStatus === "OPENED").length,
        notOpened: people.filter((p) => ["SENT", "DELIVERED", "QUEUED"].includes(p.mailStatus)).length,
        failed: people.filter((p) => p.mailStatus === "FAILED").length,
        gaveTest: people.filter((p) => p.testStatus === "GAVE").length, hasTest: people.filter((p) => p.testStatus !== "NONE").length,
        gaveAi: people.filter((p) => p.aiStatus === "GAVE").length, hasAi: people.filter((p) => p.aiStatus !== "NONE").length,
        averageTest: avg(people.map((p) => p.testScore).filter((x) => x !== null)), averageAi: avg(people.map((p) => p.aiScore).filter((x) => x !== null)),
    }
}

const lineView = (l) => ({
    product: l.packageKey ? "PACKAGE" : l.product, part: l.part || null, source: l.packageTitle || l.groupTitle || l.sourceTitle, name: l.name, email: l.email, phone: l.phone,
    registeredAt: l.registeredAt, registeredInPeriod: l.registeredInPeriod, invitedAt: l.firstInviteAt, invitesInPeriod: l.invitesInPeriod, invitedRounds: l.invitedRounds || [],
    outcome: l.outcome, score: l.score, flags: l.flags, units: l.units, mail: l.mail ?? null,
    // to open the detailed score: the test (and the candidate's sitting of it), or the AI interview drive
    testId: l.product === "ONLINE_ASSESSMENT" ? l.sourceId : null, attemptId: l.attemptId || null, aiDriveId: l.product === "AI_INTERVIEW" ? l.sourceId : null,
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
    const head = ["Organization", "Type", "Status", "Contact", "Contact email", "Contact phone", "Registered", "Gave the interview", "Not yet", "Missed", "Started, not finished", "Conversion %", "Invitations sent", "AI billable", "Online test billable", "Billing unit", "Billable units", "AI rate (INR)", "Online test rate (INR)", "Online test + AI rate (INR)", "Online test + AI candidates", "Amount excl. GST (INR)", "GST %", "GST (INR)", "Total (INR)"]
    const rows = [[`Billing ${s.period.from} to ${s.period.to}`], head]
    for (const o of s.organizations) rows.push([text(o.name), KIND_LABEL[o.kind] || o.kind, o.status, text(o.contactName), text(o.email), text(o.phone), o.registered, o.gaveOfRegistered, o.pending, o.missed, o.startedNotFinished, o.conversionPercent, o.invites, o.ai.billableCandidates, o.oa.billableCandidates, o.unit === "INTERVIEW" ? "Per round" : "Per candidate", o.billableUnits, o.aiRate, o.oaRate, o.comboRate, o.combo.candidates, o.amountExGst, o.gstPercent, o.gstAmount, o.total])
    const t = s.totals
    rows.push(["TOTAL", "", "", "", "", "", t.registered, t.gaveOfRegistered, t.pending, t.missed, t.startedNotFinished, t.conversionPercent, t.invites, t.aiBillable, t.oaBillable, "", t.billableUnits, "", "", t.amountExGst, "", t.gstAmount, t.total])
    return { filename: `billing-${s.period.from}-to-${s.period.to}.csv`, csv: toCsv(rows) }
}

const MAIL_LABEL = { QUEUED: "Queued", SENT: "Sent", DELIVERED: "Delivered", OPENED: "Opened", READ: "Opened", FAILED: "Failed", MOCK_SENT: "Sent" }
const mailText = (mail) => (mail ? MAIL_LABEL[mail.status] || mail.status : "Sent")
const fileName = (org, what, period) => `${org.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "organization"}-${what}-${period.from}-to-${period.to}.csv`
const unitLine = (card) => `Billing unit: ${card.unit === "INTERVIEW" ? "per round (every round a candidate is invited to counts)" : "per candidate (each person once)"}. Billed when the invitation email is sent. AI interview rate ${card.aiRate} INR, online test rate ${card.oaRate} INR, online test + AI rate ${card.comboRate} INR, GST ${card.gstPercent}%`

/** view=drives: one row per drive with its rounds underneath. view=candidates (default): one row per candidate. */
export const exportOrganizationCsv = async (key, query = {}) => {
    const { period, org, card, uses, lines } = await detailLines(key, query)
    if (query.view === "drives") {
        const sources = driveBreakdown(org, lines, card, uses)
        const head = ["Drive / test", "Type", "Round", "Candidates invited", "Invitations sent", "Registered", "Gave the interview", "Not yet", "Missed", "Amount excl. GST (INR)"]
        const rows = [[`${org.name}: billing by drive ${period.from} to ${period.to}`], [unitLine(card)], head]
        for (const d of sources) {
            rows.push([text(d.title), d.product === "PACKAGE" ? "Online test + AI interview" : PRODUCT_LABEL[d.product], "All rounds", d.billableCandidates, d.invites, d.registered, d.gave, d.pending + d.started, d.missed, d.amountExGst])
            for (const r of d.rounds) rows.push(["", "", text(r.title), r.candidates, r.invites, "", "", "", "", r.amountExGst ?? ""])
        }
        const total = sources.reduce((n, d) => n + d.amountExGst, 0)
        rows.push(["TOTAL", "", "", "", sources.reduce((n, d) => n + d.invites, 0), "", "", "", "", round2(total)])
        return { filename: fileName(org, "billing-by-drive", period), csv: toCsv(rows) }
    }
    const withMail = await attachMail(lines)
    const people = new Map()
    for (const l of withMail) { const id = l.email; if (!people.has(id)) people.set(id, []); people.get(id).push(l) }
    const sorted = [...people.values()].sort((a, b) => (a[0].name || "").localeCompare(b[0].name || ""))
    const head = ["#", "Candidate", "Email", "Phone", "Drives / tests invited to", "Rounds invited", "First invited on", "Invitation email", "Opened on", "Gave the interview", "Billing units", "Amount excl. GST (INR)"]
    const rows = [[`${org.name}: billing by candidate ${period.from} to ${period.to}`], [unitLine(card)], head]
    sorted.forEach((ls, i) => {
        const first = ls.map((l) => l.firstInviteAt).filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0]
        const opened = ls.map((l) => l.mail?.openedAt).filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0]
        const invited = ls.filter((l) => l.invitesInPeriod > 0)
        const status = invited.length ? (opened ? "Opened" : mailText(invited[0].mail)) : "Not invited in this period"
        rows.push([i + 1, text(ls[0].name), text(ls[0].email), text(ls[0].phone), text([...new Set(ls.map((l) => l.packageTitle || l.groupTitle || l.sourceTitle))].join("; ")), text(ls.flatMap((l) => (l.invitedRounds || []).filter((r) => r.inPeriod).map((r) => r.title)).join("; ")), when(first), status, when(opened), ls.some((l) => l.outcome === "GAVE") ? "Yes" : "No", ls.reduce((n, l) => n + (l.units || 0), 0), orgRow(org, ls, card, uses).amountExGst])
    })
    const units = lines.reduce((n, l) => n + l.units, 0)
    rows.push(["", "", "", "", "", "", "", "", "", "Total", units, orgRow(org, lines, card, uses).amountExGst])
    return { filename: fileName(org, "billing-by-candidate", period), csv: toCsv(rows) }
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
        sources: res.sources, emailsByDay: res.emailsByDay,
    }
}
export const listOwnLines = (tenantId, query = {}) => listLines(ownKey(tenantId), query)
export const exportOwnCsv = (tenantId, query = {}) => exportOrganizationCsv(ownKey(tenantId), query)
