/**
 * Give an organization's running drive more time. Dry run by default; it only ever EXTENDS (never shortens) a closing time.
 *
 *   node scripts/extend-deadline.js --org nifco --until "2026-11-28 12:00"            # list what would change (Indian time)
 *   node scripts/extend-deadline.js --org nifco --until "2026-11-28 12:00" --apply    # do it
 *
 * Changes: the closing time of every live online test round (schedule.endAt) and the "apply by" of every AI interview drive
 * and its rounds, when they close before the new time. Students who already started a test keep their own time.
 */
import "dotenv/config"
import mongoose from "mongoose"
import Client from "../models/client.model.js"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { OaAccount, OaAssessment } from "../models/oa.model.js"
import { closingInstant } from "../utils/deadline.js"

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined }
const term = arg("org"); const untilText = arg("until"); const apply = process.argv.includes("--apply")
const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(untilText || ""))
if (!term || !match) { console.log('Usage: node scripts/extend-deadline.js --org <part of the organization name> --until "YYYY-MM-DD HH:MM" [--apply]   (Indian time)'); process.exit(1) }
const until = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00.000+05:30`)
if (until.getTime() <= Date.now()) { console.log("That time has already passed."); process.exit(1) }
const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
const when = (d) => (d ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "-")

await mongoose.connect(process.env.MONGODB_URL)
const accounts = await OaAccount.find({ orgName: rx }).select("_id orgName tenantId").lean()
const clients = await Client.find({ name: rx }).select("tenantId").lean()
const tenantIds = [...new Set([...clients.map((c) => String(c.tenantId || c._id)), ...accounts.map((a) => a.tenantId).filter(Boolean).map(String)])]
if (!accounts.length && !tenantIds.length) { console.log(`No organization matches "${term}".`); await mongoose.disconnect(); process.exit(0) }
console.log(`New closing time: ${when(until)} (Indian time)\n`)

let changes = 0
const tests = await OaAssessment.find({ accountId: { $in: accounts.map((a) => a._id) }, status: "PUBLISHED" }).select("title roundNumber schedule").lean()
console.log("Online test rounds:")
for (const t of tests) {
    const end = t.schedule?.endAt
    const extend = end && new Date(end) < until
    console.log(`- ${t.title} (round ${t.roundNumber || 1}) | ${t.schedule?.mode} | closes ${when(end)} | ${extend ? "WILL EXTEND" : "no change"}`)
    if (extend && t.schedule.mode === "FIXED") console.log("    note: this test is FIXED start - a later closing time does not let new people begin after the late-entry window.")
    if (extend) { changes += 1; if (apply) await OaAssessment.updateOne({ _id: t._id }, { $set: { "schedule.endAt": until } }) }
}
if (!tests.length) console.log("  (none live)")

const drives = await InterviewDrive.find({ tenantId: { $in: tenantIds }, deletedAt: null, status: { $ne: "ARCHIVED" } }).select("title expiryDate rounds.roundNumber rounds.expiryDate").lean()
console.log("\nAI interview drives:")
for (const d of drives) {
    const driveEnd = closingInstant(d.expiryDate)
    const extendDrive = driveEnd && driveEnd < until
    console.log(`- ${d.title} | apply by ${when(driveEnd)} | ${extendDrive ? "WILL EXTEND" : "no change"}`)
    const set = {}
    if (extendDrive) set.expiryDate = until
    ;(d.rounds || []).forEach((r, i) => {
        const end = r.expiryDate ? closingInstant(r.expiryDate) : null
        if (end && end < until) { set[`rounds.${i}.expiryDate`] = until; console.log(`    round ${r.roundNumber}: ${when(end)} -> WILL EXTEND`) }
    })
    if (Object.keys(set).length) { changes += 1; if (apply) await InterviewDrive.updateOne({ _id: d._id }, { $set: set }) }
}
if (!drives.length) console.log("  (none)")
console.log(changes ? (apply ? `\nDone: ${changes} item(s) extended.` : `\n${changes} item(s) would change. Run again with --apply.`) : "\nNothing to change.")
await mongoose.disconnect()
