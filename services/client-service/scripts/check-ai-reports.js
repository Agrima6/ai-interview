/**
 * Why is an AI interview "report pending"? READ-ONLY: it only reads our database and asks the interviewer service (GET)
 * what it has. It never completes, changes or re-runs anything, and never prints the service key.
 *
 *   node scripts/check-ai-reports.js --org nifco                  # AI interviews finished today (Indian time)
 *   node scripts/check-ai-reports.js --org nifco --date 2026-11-26
 */
import "dotenv/config"
import axios from "axios"
import mongoose from "mongoose"
import Client from "../models/client.model.js"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { OaAccount } from "../models/oa.model.js"

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined }
const term = arg("org")
if (!term) { console.log("Usage: node scripts/check-ai-reports.js --org <part of the organization name> [--date YYYY-MM-DD]"); process.exit(1) }
const day = arg("date") || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
const from = new Date(`${day}T00:00:00.000+05:30`); const to = new Date(`${day}T23:59:59.999+05:30`)
const when = (d) => (d ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "-")
const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")

const base = process.env.AGENT_SERVICE_URL || "http://localhost:8000"
console.log(`\nInterviewer service: ${base}  (key ${process.env.AGENT_SERVICE_KEY ? "set" : "NOT set"}, demo fallback ${String(process.env.AGENT_DEMO_FALLBACK || "off")})`)
const http = axios.create({ baseURL: base, timeout: 15000, headers: process.env.AGENT_SERVICE_KEY ? { "X-Agent-Key": process.env.AGENT_SERVICE_KEY } : {} })
const ask = async (path) => {
    try { const r = await http.get(path); return { ok: true, status: r.status, data: r.data } } catch (e) { return { ok: false, status: e.response?.status || null, error: e.response?.data?.detail || e.code || e.message } }
}

await mongoose.connect(process.env.MONGODB_URL)
const clients = await Client.find({ name: rx }).select("name tenantId").lean()
const accounts = await OaAccount.find({ orgName: rx }).select("tenantId").lean()
const tenantIds = [...new Set([...clients.map((c) => String(c.tenantId || c._id)), ...accounts.map((a) => a.tenantId).filter(Boolean).map(String)])]
if (!tenantIds.length) { console.log(`No organization matches "${term}".`); await mongoose.disconnect(); process.exit(0) }

const health = await ask("/health")
// any HTTP answer, even "not found" for a path the service does not have, proves it is reachable
console.log(`Reachable: ${health.status ? `yes (HTTP ${health.status})` : `NO (${health.error})`}\n`)

const drives = await InterviewDrive.find({ tenantId: { $in: tenantIds }, "rounds.candidates.attemptedDate": { $gte: from, $lte: to } }).select("title agentRoleId rounds").lean()
let count = 0
for (const d of drives) for (const r of d.rounds || []) for (const c of r.candidates || []) {
    if (!c.attemptedDate || c.attemptedDate < from || c.attemptedDate > to) continue
    count += 1
    console.log(`- ${c.name} <${c.email}> | ${d.title} R${r.roundNumber} | finished ${when(c.attemptedDate)} | status ${c.status}`)
    console.log(`    ours: interview id ${c.agentInterviewId || "MISSING"} | stored report ${c.agentReport ? "yes" : "no"} | stored score ${c.aiScore ?? 0} | recording ${c.recordings?.length ? c.recordings.map((x) => x.status).join(",") : "none"}`)
    if (!c.agentInterviewId) { console.log("    => the AI interview was never started on the interviewer service (nothing to fetch a report for)"); continue }
    const rep = await ask(`/v1/interviews/${c.agentInterviewId}/report`)
    if (!rep.ok) { console.log(`    interviewer service report: ${rep.status || "no answer"} ${rep.error}`); const iv = await ask(`/v1/interviews/${c.agentInterviewId}`); console.log(`    interviewer service interview: ${iv.ok ? `exists, status ${iv.data?.status || "?"}` : `${iv.status || "no answer"} ${iv.error}`}`); continue }
    const x = rep.data || {}
    console.log(`    interviewer service report: status ${x.report_status || x.status || "?"} | score ${x.final_score ?? "none"} | content ${x.content ? "yes" : "no"}`)
}
if (!count) console.log("No AI interviews finished on that day for this organization.")
console.log("")
await mongoose.disconnect()
