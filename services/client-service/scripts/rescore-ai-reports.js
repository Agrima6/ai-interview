/**
 * Rebuild AI interview reports that failed, or were scored while the language model was unavailable (a daily limit
 * reached shows up as a FAILED report, or a READY one with a score of 0). Dry run by default: it only lists what it would do.
 *
 *   node scripts/rescore-ai-reports.js --org nifco --date 2026-11-26            # list
 *   node scripts/rescore-ai-reports.js --org nifco --date 2026-11-26 --apply    # rebuild them and store the new reports
 *
 * The conversation is not touched: the interviewer service scores the saved transcript again.
 */
import "dotenv/config"
import axios from "axios"
import mongoose from "mongoose"
import Client from "../models/client.model.js"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { OaAccount } from "../models/oa.model.js"

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined }
const term = arg("org"); const apply = process.argv.includes("--apply")
if (!term) { console.log("Usage: node scripts/rescore-ai-reports.js --org <part of the organization name> [--date YYYY-MM-DD] [--apply]"); process.exit(1) }
const day = arg("date") || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
const from = new Date(`${day}T00:00:00.000+05:30`); const to = new Date(`${day}T23:59:59.999+05:30`)
const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const http = axios.create({ baseURL: process.env.AGENT_SERVICE_URL || "http://localhost:8000", timeout: 20000, headers: process.env.AGENT_SERVICE_KEY ? { "X-Agent-Key": process.env.AGENT_SERVICE_KEY } : {} })
const status = (r) => r?.report_status || r?.status

await mongoose.connect(process.env.MONGODB_URL)
const clients = await Client.find({ name: rx }).select("tenantId").lean()
const accounts = await OaAccount.find({ orgName: rx }).select("tenantId").lean()
const tenantIds = [...new Set([...clients.map((c) => String(c.tenantId || c._id)), ...accounts.map((a) => a.tenantId).filter(Boolean).map(String)])]
if (!tenantIds.length) { console.log(`No organization matches "${term}".`); await mongoose.disconnect(); process.exit(0) }

const drives = await InterviewDrive.find({ tenantId: { $in: tenantIds }, "rounds.candidates.attemptedDate": { $gte: from, $lte: to } }).select("rounds").lean()
let found = 0; let rebuilt = 0
for (const d of drives) for (const r of d.rounds || []) for (const c of r.candidates || []) {
    if (!c.agentInterviewId || !c.attemptedDate || c.attemptedDate < from || c.attemptedDate > to) continue
    let report
    try { report = (await http.get(`/v1/interviews/${c.agentInterviewId}/report`)).data } catch { report = null }
    const failed = status(report) === "FAILED"
    const zero = status(report) === "READY" && !Number(report?.final_score)
    if (!failed && !zero) continue
    found += 1
    console.log(`- ${c.name} <${c.email}> | ${failed ? "report FAILED" : "READY with score 0"} | ${c.agentInterviewId}`)
    if (!apply) continue
    try { await http.post(`/v1/interviews/${c.agentInterviewId}/rescore`) } catch (e) { console.log(`    could not start: ${e.response?.status || ""} ${e.response?.data?.detail || e.message}`); continue }
    let fresh = null
    for (let i = 0; i < 24; i += 1) { // up to ~2 minutes
        await sleep(5000)
        try { fresh = (await http.get(`/v1/interviews/${c.agentInterviewId}/report`)).data } catch { fresh = null }
        if (["READY", "FAILED"].includes(status(fresh))) break
    }
    if (status(fresh) !== "READY") { console.log(`    still ${status(fresh) || "no answer"} - try again later`); continue }
    await InterviewDrive.updateOne({ _id: d._id }, { $set: { "rounds.$[r].candidates.$[c].agentReport": fresh, "rounds.$[r].candidates.$[c].aiScore": Math.round(fresh.final_score || 0) } },
        { arrayFilters: [{ "r.roundNumber": r.roundNumber }, { "c.agentInterviewId": c.agentInterviewId }] })
    rebuilt += 1
    console.log(`    rebuilt: score ${fresh.final_score}`)
}
console.log(found ? (apply ? `\n${rebuilt} of ${found} rebuilt.` : `\n${found} would be rebuilt. Run again with --apply.`) : "\nNothing to rebuild.")
await mongoose.disconnect()
