/**
 * Who finished today, with their scores. READ-ONLY: it only reads, it never changes anything.
 *
 *   node scripts/results-today.js --org nifco                 # today (Indian time)
 *   node scripts/results-today.js --org nifco --date 2026-11-26
 *
 * --org is part of the organization's name. Prints, for every online test and AI interview of that organization,
 * the candidates who finished on that day: name, email, score, how it ended, proctoring warnings and the AI verdict.
 */
import "dotenv/config"
import mongoose from "mongoose"
import Client from "../models/client.model.js"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { OaAccount, OaAssessment, OaAttempt, OaDrive, OaStudent } from "../models/oa.model.js"

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined }
const term = arg("org")
if (!term) { console.log("Usage: node scripts/results-today.js --org <part of the organization name> [--date YYYY-MM-DD]"); process.exit(1) }
const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })
const day = arg("date") || ist.format(new Date())
if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) { console.log("--date must look like 2026-11-26"); process.exit(1) }
const from = new Date(`${day}T00:00:00.000+05:30`); const to = new Date(`${day}T23:59:59.999+05:30`)
const when = (d) => (d ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "-")
const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")

await mongoose.connect(process.env.MONGODB_URL)
const clients = await Client.find({ name: rx }).select("name tenantId").lean()
const accounts = await OaAccount.find({ orgName: rx }).select("orgName tenantId").lean()
if (!clients.length && !accounts.length) { console.log(`No organization matches "${term}".`); await mongoose.disconnect(); process.exit(0) }
console.log(`\nResults for ${[...new Set([...clients.map((c) => c.name), ...accounts.map((a) => a.orgName)])].join(", ")} on ${day} (Indian time)\n`)

// ---- online tests ----
const accountIds = [...new Set([...accounts.map((a) => String(a._id)), ...(await OaAccount.find({ tenantId: { $in: clients.map((c) => String(c.tenantId || c._id)) } }).select("_id").lean()).map((a) => String(a._id))])]
const done = ["SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"]
const attempts = await OaAttempt.find({ accountId: { $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)) }, status: { $in: done }, $or: [{ submittedAt: { $gte: from, $lte: to } }, { submittedAt: null, startedAt: { $gte: from, $lte: to } }] }).lean()
const students = new Map((await OaStudent.find({ _id: { $in: attempts.map((a) => a.studentId) } }).select("name email phone").lean()).map((s) => [String(s._id), s]))
const assessments = new Map((await OaAssessment.find({ _id: { $in: attempts.map((a) => a.assessmentId) } }).select("title roundNumber roundLabel driveId settings.passPercent").lean()).map((a) => [String(a._id), a]))
const drives = new Map((await OaDrive.find({ _id: { $in: [...assessments.values()].map((a) => a.driveId).filter(Boolean) } }).select("title").lean()).map((d) => [String(d._id), d.title]))
console.log(`ONLINE TESTS: ${attempts.length} finished`)
for (const a of attempts.sort((x, y) => new Date(x.submittedAt || x.startedAt) - new Date(y.submittedAt || y.startedAt))) {
    const s = students.get(String(a.studentId)) || {}; const t = assessments.get(String(a.assessmentId)) || {}
    const pass = t.settings?.passPercent
    console.log(`  - ${s.name || "?"} <${s.email || "?"}> | ${drives.get(String(t.driveId)) || t.title} R${t.roundNumber || 1} | score ${Math.round(a.percent || 0)}%${pass !== undefined ? (a.percent >= pass ? " (pass)" : " (below pass)") : ""} | ${a.status}${a.endReason ? ` (${a.endReason})` : ""} | warnings ${a.violationCount || 0} | grading ${a.gradingStatus} | ${when(a.submittedAt || a.startedAt)}`)
}

// ---- AI interviews ----
const tenantIds = [...new Set([...clients.map((c) => String(c.tenantId || c._id)), ...accounts.map((a) => a.tenantId).filter(Boolean).map(String)])]
const aiDrives = await InterviewDrive.find({ tenantId: { $in: tenantIds }, "rounds.candidates.attemptedDate": { $gte: from, $lte: to } }).select("title rounds").lean()
let n = 0
const lines = []
for (const d of aiDrives) for (const r of d.rounds || []) for (const c of r.candidates || []) {
    if (!c.attemptedDate || c.attemptedDate < from || c.attemptedDate > to) continue
    n += 1
    const rep = c.agentReport || {}
    lines.push(`  - ${c.name} <${c.email}> | ${d.title} R${r.roundNumber} | AI score ${c.aiScore ?? rep.final_score ?? "-"} | status ${c.status} | warnings ${c.malpracticeFlags || 0} | ${rep.recommendation || rep.verdict || (c.agentReport ? "report ready" : "report pending")} | ${when(c.attemptedDate)}`)
}
console.log(`\nAI INTERVIEWS: ${n} finished`)
lines.forEach((l) => console.log(l))
console.log("")
await mongoose.disconnect()
