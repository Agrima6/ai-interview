/**
 * Which emails failed, and why. READ-ONLY.
 *
 *   node scripts/failed-emails.js                 # the last 3 days
 *   node scripts/failed-emails.js --days 7 --event OA_INVITE
 *
 * Shows the recipient, what kind of email it was, how many times it was tried, and the provider's reason (kept from now on;
 * older failures only have a generic code, and their reason is in the service log).
 */
import "dotenv/config"
import mongoose from "mongoose"
import Communication from "../models/communication.model.js"

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined }
const days = Math.min(60, Math.max(1, Number(arg("days")) || 3))
const event = arg("event")
const when = (d) => (d ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "-")

await mongoose.connect(process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/workmateiq_communication")
const since = new Date(Date.now() - days * 86400000)
const rows = await Communication.find({ channel: "EMAIL", status: "FAILED", createdAt: { $gte: since }, ...(event ? { eventType: event } : {}) }).sort({ createdAt: -1 }).limit(500).lean()
const total = await Communication.countDocuments({ channel: "EMAIL", createdAt: { $gte: since }, ...(event ? { eventType: event } : {}) })
console.log(`\nEmails in the last ${days} day(s)${event ? ` (${event})` : ""}: ${total}. Still failed: ${rows.length}.\n`)
const byCode = new Map()
for (const r of rows) byCode.set(r.lastErrorCode || "UNKNOWN", (byCode.get(r.lastErrorCode || "UNKNOWN") || 0) + 1)
for (const [code, n] of byCode) console.log(`  ${code}: ${n}`)
console.log("")
for (const r of rows) {
    console.log(`- ${r.recipient} | ${r.eventType} | tried ${r.attempts}x | ${r.lastErrorCode || "?"} | ${r.lastError || "(reason only in the service log)"} | ${when(r.failedAt || r.createdAt)}`)
}
const retryable = rows.filter((r) => ["RATE_LIMITED", "PROVIDER_5XX", "NETWORK"].includes(r.lastErrorCode) && r.attempts < 4).length
console.log(`\n${retryable} of these are temporary failures that the service will send again by itself.\n`)
await mongoose.disconnect()
