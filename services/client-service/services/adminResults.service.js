import mongoose from "mongoose"
import Client from "../models/client.model.js"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { OaAccount, OaAssessment, OaAttempt, OaDrive, OaStudent } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import { attemptDetail, results } from "./oaAssessment.service.js"

/**
 * For the platform owner: read any organization's online-test results without signing in as it. Everything here only READS.
 * The detail views reuse the organizer's own screens (results table, a candidate's answers), so the owner sees exactly what the
 * organization sees, plus the paper's layout and a sanity check of the scores.
 */

const FINISHED = ["SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"]
const round1 = (n) => Math.round(n * 10) / 10
const round2 = (n) => Math.round(n * 100) / 100

const assessmentOr404 = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "NOT_FOUND", "Test not found.")
    const a = await OaAssessment.findById(id)
    if (!a) throw new ApiError(404, "NOT_FOUND", "Test not found.")
    return a
}

// ---------- which organizations and tests ----------

export const listOrganizations = async () => {
    const [accounts, clients] = await Promise.all([
        OaAccount.find({}).select("orgName tenantId").lean(),
        Client.find({}).select("name tenantId").lean(),
    ])
    const clientName = new Map(clients.map((c) => [String(c.tenantId || c._id), c.name]))
    const byKey = new Map()
    for (const a of accounts) {
        const key = a.tenantId ? String(a.tenantId) : `oa:${a._id}`
        if (!byKey.has(key)) byKey.set(key, { key, name: clientName.get(key) || a.orgName, accountIds: [] })
        byKey.get(key).accountIds.push(a._id)
    }
    const stats = await OaAssessment.aggregate([{ $match: { status: { $ne: "ARCHIVED" } } }, { $group: { _id: "$accountId", tests: { $sum: 1 } } }])
    const finished = await OaAttempt.aggregate([{ $match: { status: { $in: FINISHED } } }, { $group: { _id: "$accountId", n: { $sum: 1 } } }])
    const testsOf = new Map(stats.map((s) => [String(s._id), s.tests])); const doneOf = new Map(finished.map((s) => [String(s._id), s.n]))
    return [...byKey.values()].map((o) => ({
        key: o.key, name: o.name,
        tests: o.accountIds.reduce((n, id) => n + (testsOf.get(String(id)) || 0), 0),
        finished: o.accountIds.reduce((n, id) => n + (doneOf.get(String(id)) || 0), 0),
    })).filter((o) => o.tests > 0).sort((a, b) => b.finished - a.finished || a.name.localeCompare(b.name))
}

const accountIdsOf = async (key) => {
    if (/^oa:[a-f0-9]{24}$/i.test(key)) return [new mongoose.Types.ObjectId(key.slice(3))]
    if (!/^[a-f0-9]{24}$/i.test(key)) throw new ApiError(404, "NOT_FOUND", "Organization not found.")
    return (await OaAccount.find({ tenantId: key }).select("_id").lean()).map((a) => a._id)
}

/** Every test (round) of one organization, newest first, with how many sat it and how they did. */
export const listTests = async (key) => {
    const accountIds = await accountIdsOf(key)
    const tests = await OaAssessment.find({ accountId: { $in: accountIds }, status: { $ne: "ARCHIVED" } }).select("title kind status roundNumber roundLabel driveId schedule createdAt").sort({ createdAt: -1 }).lean()
    const ids = tests.map((t) => t._id)
    const [drives, students, attempts] = await Promise.all([
        OaDrive.find({ _id: { $in: tests.map((t) => t.driveId).filter(Boolean) } }).select("title").lean(),
        OaStudent.aggregate([{ $match: { assessmentId: { $in: ids }, "approval.status": { $nin: ["PENDING", "REJECTED"] } } }, { $group: { _id: "$assessmentId", n: { $sum: 1 } } }]),
        OaAttempt.aggregate([{ $match: { assessmentId: { $in: ids } } }, { $group: { _id: "$assessmentId", started: { $sum: 1 }, finished: { $sum: { $cond: [{ $in: ["$status", FINISHED] }, 1, 0] } }, avg: { $avg: { $cond: [{ $in: ["$status", FINISHED] }, "$percent", null] } } } }]),
    ])
    const driveTitle = new Map(drives.map((d) => [String(d._id), d.title])); const inv = new Map(students.map((s) => [String(s._id), s.n])); const att = new Map(attempts.map((a) => [String(a._id), a]))
    return tests.map((t) => {
        const a = att.get(String(t._id))
        return { id: String(t._id), title: t.title, drive: t.driveId ? driveTitle.get(String(t.driveId)) || null : null, roundNumber: t.roundNumber || 1, roundLabel: t.roundLabel || "", kind: t.kind || "TEST", status: t.status, invited: inv.get(String(t._id)) || 0, started: a?.started || 0, finished: a?.finished || 0, averagePercent: a?.avg == null ? null : round1(a.avg), createdAt: t.createdAt }
    })
}

// ---------- the organizer's own views, for the owner ----------

export const testResults = async (id, query) => results(String((await assessmentOr404(id)).accountId), id, query)
export const testAttempt = async (id, attemptId) => attemptDetail(String((await assessmentOr404(id)).accountId), id, attemptId)

// ---------- the paper ----------

const TYPE_LABEL = { MCQ: "Single choice", MSQ: "Multiple choice", SHORT: "Short answer", LONG: "Long answer", CODING: "Coding", VIDEO: "Video answer" }

/** How the paper was made: sections, the kinds of question in each, marks, time, rules. */
export const testPaper = async (id) => {
    const a = await assessmentOr404(id)
    const questions = a.questions.map((q) => (q.toObject ? q.toObject() : q))
    const sections = a.sections.map((s, index) => {
        const qs = questions.filter((q) => q.sectionId === s.id)
        const types = {}
        for (const q of qs) types[q.type] = (types[q.type] || 0) + 1
        return {
            id: s.id, number: index + 1, title: s.title || "", questionCount: qs.length, marks: round2(qs.reduce((n, q) => n + (q.marks || 0), 0)),
            types: Object.entries(types).map(([type, count]) => ({ type, label: TYPE_LABEL[type] || type, count })),
            questions: qs.map((q) => ({ id: q.id, type: q.type, label: TYPE_LABEL[q.type] || q.type, text: q.text, marks: q.marks, negativeMarks: q.negativeMarks || 0, difficulty: q.difficulty, source: q.source, options: (q.options || []).length })),
        }
    })
    const total = questions.reduce((n, q) => n + (q.marks || 0), 0)
    const auto = questions.filter((q) => ["MCQ", "MSQ"].includes(q.type)); const manual = questions.filter((q) => !["MCQ", "MSQ"].includes(q.type))
    return {
        id: String(a._id), title: a.title, status: a.status,
        totalQuestions: questions.length, totalMarks: round2(total),
        autoMarked: { questions: auto.length, marks: round2(auto.reduce((n, q) => n + (q.marks || 0), 0)) },
        needsReview: { questions: manual.length, marks: round2(manual.reduce((n, q) => n + (q.marks || 0), 0)) },
        durationMinutes: a.settings?.durationMinutes ?? a.schedule?.durationMinutes ?? null, passPercent: a.settings?.passPercent ?? 40,
        negativeMarking: questions.some((q) => (q.negativeMarks || 0) > 0),
        shuffle: { questions: Boolean(a.settings?.shuffleQuestions), options: Boolean(a.settings?.shuffleOptions), sections: Boolean(a.settings?.shuffleSections) },
        schedule: a.schedule?.startAt ? { mode: a.schedule.mode, startAt: a.schedule.startAt, endAt: a.schedule.endAt } : null,
        proctoring: { level: a.proctoring?.level || null, camera: a.proctoring?.requireCamera ?? null, screenShare: a.proctoring?.requireScreenShare ?? null, fullscreen: a.proctoring?.requireFullscreen ?? null, faceChecks: a.proctoring?.faceChecks ?? null, maxViolations: a.proctoring?.maxViolations ?? null },
        sections,
    }
}

// ---------- is the score normal? ----------

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const stdev = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) }
const signature = (value) => (Array.isArray(value) ? [...value].map(String).sort().join("|") : value == null ? "" : String(value))

const INSIGHT_ATTEMPT_CAP = 600

/**
 * Plain-language checks on how a test went: the spread of scores, scores that repeat, questions nobody (or everybody) got right,
 * candidates whose answers match too closely, and people who finished suspiciously fast. It never accuses: it says what is
 * unusual and why it may still be innocent.
 */
export const testInsights = async (id) => {
    const a = await assessmentOr404(id)
    const questions = a.questions.map((q) => (q.toObject ? q.toObject() : q))
    const byId = new Map(questions.map((q) => [q.id, q]))
    const attempts = await OaAttempt.find({ assessmentId: a._id, status: { $in: FINISHED } }).select("studentId status startedAt submittedAt percent score maxScore gradingStatus violationCount answers grades ip adminDecision").sort({ submittedAt: -1 }).limit(INSIGHT_ATTEMPT_CAP).lean()
    const students = new Map((await OaStudent.find({ _id: { $in: attempts.map((x) => x.studentId) } }).select("name email").lean()).map((s) => [String(s._id), s]))
    const nameOf = (x) => students.get(String(x.studentId))?.name || "A candidate"
    const pass = a.settings?.passPercent ?? 40
    const allowedMin = a.settings?.durationMinutes ?? a.schedule?.durationMinutes ?? null
    const n = attempts.length
    const percents = attempts.map((x) => x.percent ?? 0)
    const notes = []   // { level: "ok" | "watch" | "concern", text }

    // 1. the spread
    const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i === 9 ? 100 : i * 10 + 9, count: 0 }))
    for (const p of percents) buckets[Math.min(9, Math.max(0, Math.floor(p / 10)))].count += 1
    const sd = stdev(percents)
    const spread = { count: n, average: n ? round1(mean(percents)) : null, median: n ? round1(median(percents)) : null, lowest: n ? Math.min(...percents) : null, highest: n ? Math.max(...percents) : null, stdev: sd == null ? null : round1(sd), passPercent: pass, passed: attempts.filter((x) => (x.percent ?? 0) >= pass && x.adminDecision !== "DISQUALIFIED").length, buckets }
    if (n < 10) notes.push({ level: "watch", text: `Only ${n} candidate${n === 1 ? "" : "s"} finished, which is too few to say what a normal spread looks like.` })

    // 2. scores that repeat
    const counts = new Map()
    for (const p of percents) counts.set(round1(p), (counts.get(round1(p)) || 0) + 1)
    const repeated = [...counts.entries()].filter(([, c]) => c >= 3).map(([percent, count]) => ({ percent, count, share: round1((count / n) * 100) })).sort((x, y) => y.count - x.count)
    if (n >= 10 && repeated.length && repeated[0].share >= 25) {
        const r = repeated[0]
        notes.push({ level: r.share >= 40 ? "concern" : "watch", text: `${r.count} of ${n} candidates (${r.share}%) scored exactly ${r.percent}%. Many people landing on the same score is unusual. It happens when most of the paper is multiple choice and the same number of answers were right, but it can also mean shared answers.` })
    }
    if (n >= 10 && sd !== null && sd < 6) notes.push({ level: "watch", text: `Scores are tightly bunched (spread of about ${round1(sd)} points). A real group of candidates usually varies more.` })
    const passRate = n ? (spread.passed / n) * 100 : 0
    if (n >= 10 && passRate >= 90) notes.push({ level: "watch", text: `${round1(passRate)}% passed. The paper may be too easy to separate candidates.` })
    if (n >= 10 && passRate <= 10) notes.push({ level: "watch", text: `Only ${round1(passRate)}% passed. The paper may be too hard, or the pass mark too high.` })

    // 3. how each question went
    const stat = new Map(questions.map((q) => [q.id, { id: q.id, type: q.type, text: q.text, marks: q.marks, answered: 0, full: 0, zero: 0, totalMarks: 0, graded: 0 }]))
    for (const x of attempts) for (const q of questions) {
        const s = stat.get(q.id); const given = x.answers?.[q.id]?.value; const g = x.grades?.[q.id]
        if (given !== undefined && given !== null && given !== "" && !(Array.isArray(given) && !given.length)) s.answered += 1
        if (g && typeof g.marks === "number") { s.graded += 1; s.totalMarks += g.marks; if (g.marks >= q.marks) s.full += 1; if (g.marks <= 0) s.zero += 1 }
    }
    const questionRows = [...stat.values()].map((s) => ({ ...s, label: TYPE_LABEL[s.type] || s.type, answerRate: n ? round1((s.answered / n) * 100) : null, fullMarksRate: s.graded ? round1((s.full / s.graded) * 100) : null, averageMarks: s.graded ? round2(s.totalMarks / s.graded) : null }))
    const objective = questionRows.filter((q) => ["MCQ", "MSQ"].includes(q.type) && q.graded >= 5)
    const nobody = objective.filter((q) => q.fullMarksRate === 0); const everybody = objective.filter((q) => q.fullMarksRate === 100)
    if (nobody.length) notes.push({ level: "watch", text: `${nobody.length} multiple-choice question${nobody.length === 1 ? " was" : "s were"} answered correctly by nobody. Check the answer key.` })
    if (everybody.length >= 3) notes.push({ level: "watch", text: `${everybody.length} multiple-choice questions were answered correctly by everyone, so they separate no one.` })
    const unmarked = questions.filter((q) => !["MCQ", "MSQ"].includes(q.type))
    const pending = attempts.filter((x) => x.gradingStatus === "PENDING_REVIEW").length
    if (pending) notes.push({ level: "watch", text: `${pending} candidate${pending === 1 ? "'s" : "s'"} written or coding answers (${unmarked.length} question${unmarked.length === 1 ? "" : "s"} per paper) are still being marked by AI. Until that finishes, these scores only count the multiple-choice part, so they are provisional and will change.` })

    // 4. answers that match too closely (objective questions only)
    const objectiveIds = questions.filter((q) => ["MCQ", "MSQ"].includes(q.type)).map((q) => q.id)
    const sig = attempts.map((x) => objectiveIds.map((qid) => signature(x.answers?.[qid]?.value)))
    const similar = []
    if (objectiveIds.length >= 8) {
        for (let i = 0; i < attempts.length; i++) for (let j = i + 1; j < attempts.length; j++) {
            let both = 0; let same = 0; let sameWrong = 0
            for (let k = 0; k < objectiveIds.length; k++) {
                if (!sig[i][k] || !sig[j][k]) continue
                both += 1
                if (sig[i][k] === sig[j][k]) {
                    same += 1
                    const q = byId.get(objectiveIds[k]); const right = signature(q.correct)
                    if (sig[i][k] !== right) sameWrong += 1
                }
            }
            if (both >= 8 && same / both >= 0.9 && sameWrong >= 3) similar.push({ a: nameOf(attempts[i]), b: nameOf(attempts[j]), questions: both, identical: same, identicalWrong: sameWrong, share: round1((same / both) * 100) })
        }
        similar.sort((x, y) => y.identicalWrong - x.identicalWrong || y.share - x.share)
    }
    if (similar.length) notes.push({ level: similar.length >= 3 ? "concern" : "watch", text: `${similar.length} pair${similar.length === 1 ? "" : "s"} of candidates gave almost the same multiple-choice answers, including the same wrong ones. Wrong answers matching is the strongest sign of sharing. Options and questions are shuffled per candidate, so this does not happen by chance.` })

    // 5. time
    const minutes = attempts.filter((x) => x.submittedAt && x.startedAt).map((x) => ({ name: nameOf(x), min: (new Date(x.submittedAt) - new Date(x.startedAt)) / 60000, percent: x.percent ?? 0 }))
    const fast = allowedMin ? minutes.filter((m) => m.min < allowedMin * 0.25 && m.percent >= (median(percents) ?? 0)) : []
    const timing = { allowedMinutes: allowedMin, averageMinutes: minutes.length ? round1(mean(minutes.map((m) => m.min))) : null, medianMinutes: minutes.length ? round1(median(minutes.map((m) => m.min))) : null, fastest: minutes.length ? round1(Math.min(...minutes.map((m) => m.min))) : null, slowest: minutes.length ? round1(Math.max(...minutes.map((m) => m.min))) : null }
    if (fast.length) notes.push({ level: "watch", text: `${fast.length} candidate${fast.length === 1 ? "" : "s"} finished in under a quarter of the allowed time with an above-median score (${fast.slice(0, 3).map((m) => `${m.name}, ${round1(m.min)} min`).join("; ")}).` })

    // 6. the room
    const ips = new Map()
    for (const x of attempts) if (x.ip) ips.set(x.ip, (ips.get(x.ip) || 0) + 1)
    const sharedNetwork = [...ips.entries()].filter(([, c]) => c >= 3).map(([ip, count]) => ({ ip, count })).sort((x, y) => y.count - x.count)
    if (sharedNetwork.length) notes.push({ level: "watch", text: `${sharedNetwork.reduce((s, x) => s + x.count, 0)} candidates sat the test from ${sharedNetwork.length} shared network address${sharedNetwork.length === 1 ? "" : "es"}. For a campus or office this is normal; for remote candidates it is worth a look.` })
    const proctoring = { flagged: attempts.filter((x) => (x.violationCount || 0) > 0).length, endedByProctor: attempts.filter((x) => x.status === "TERMINATED").length, totalWarnings: attempts.reduce((s, x) => s + (x.violationCount || 0), 0) }

    if (!notes.some((x) => x.level !== "ok") && n >= 10) notes.push({ level: "ok", text: "Nothing unusual: the scores are spread out, no cluster of identical scores, no closely matching answers." })
    const verdict = notes.some((x) => x.level === "concern") ? "CONCERN" : notes.some((x) => x.level === "watch") ? "WATCH" : n >= 10 ? "NORMAL" : "TOO_FEW"
    return { verdict, notes, spread, repeatedScores: repeated, questions: questionRows, similarAnswers: similar.slice(0, 20), timing, sharedNetwork, proctoring, basedOn: { attempts: n, capped: n >= INSIGHT_ATTEMPT_CAP } }
}

// ---------- a candidate's AI interview report ----------

/**
 * The AI interview of one candidate (found by email in an AI interview drive): score, summary, strengths and gaps, and each question's
 * evaluation. `tenantId` limits it to one organization's own drives (the organization's billing page); the platform owner passes none.
 * Recordings, the transcript and screenshots stay with the organization: only the written evaluation is returned.
 */
export const aiCandidateOf = async (driveId, email, tenantId = null) => {
    if (!mongoose.isValidObjectId(driveId)) throw new ApiError(404, "NOT_FOUND", "AI interview not found.")
    const filter = { _id: driveId, ...(tenantId ? { tenantId: String(tenantId) } : {}) }
    if (!(await InterviewDrive.exists(filter))) throw new ApiError(404, "NOT_FOUND", "AI interview not found.")
    try {
        const { refreshDriveReports } = await import("./interviewDrive.service.js")
        await Promise.race([refreshDriveReports(driveId), new Promise((resolve) => setTimeout(resolve, 6000))])
    } catch { /* the report is shown if it is already stored */ }
    const drive = await InterviewDrive.findOne(filter).select("title rounds").lean()
    const wanted = String(email || "").trim().toLowerCase()
    const hits = []
    for (const r of drive.rounds || []) for (const c of r.candidates || []) if (String(c.email || "").trim().toLowerCase() === wanted) hits.push({ c, round: r })
    if (!hits.length) throw new ApiError(404, "NOT_FOUND", "This candidate has not been added to the AI interview.")
    const best = hits.find((h) => h.c.agentReport) || hits[0]
    const c = best.c
    return {
        id: c.id, name: c.name, email: c.email, phone: c.phone, exp: c.exp, status: c.status, aiScore: c.aiScore ?? 0, agentReport: c.agentReport || null,
        attemptedDate: c.attemptedDate || null, interviewSlot: c.interviewSlot || null, malpracticeFlags: c.malpracticeFlags || 0, preferredLanguage: c.preferredLanguage || "en",
        driveTitle: drive.title, driveId: String(driveId), roundNumber: best.round.roundNumber, roundTitle: best.round.title,
    }
}
