/**
 * Retention for interview recordings.
 *
 *   RECORDING_RETENTION_DAYS=180 node scripts/purge-recordings.mjs           # dry run: lists what would be removed
 *   RECORDING_RETENTION_DAYS=180 node scripts/purge-recordings.mjs --apply   # deletes the stored files
 *
 * Removes the stored recording files (assembled files, and the legacy single-file upload) of interviews that
 * finished more than RECORDING_RETENTION_DAYS days ago, and clears the pointers so HR sees "No recording was
 * stored" rather than a broken player. Nothing else about the candidate or their report is touched.
 * Does nothing unless RECORDING_RETENTION_DAYS is set - there is no default deletion.
 */
import "dotenv/config"
import mongoose from "mongoose"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { RECORDINGS_BUCKET, deleteObject } from "../config/s3Client.js"

const days = Number(process.env.RECORDING_RETENTION_DAYS)
if (!Number.isFinite(days) || days < 1) { console.log("RECORDING_RETENTION_DAYS is not set - nothing to do."); process.exit(0) }
const apply = process.argv.includes("--apply")
const cutoff = new Date(Date.now() - days * 86400000)

await mongoose.connect(process.env.MONGODB_URL)
let files = 0
for await (const drive of InterviewDrive.find({ "rounds.candidates.attemptedDate": { $lt: cutoff } })) {
    let changed = false
    for (const round of drive.rounds) for (const c of round.candidates) {
        if (!c.attemptedDate || c.attemptedDate >= cutoff) continue
        const keys = [c.recordingFilename, ...(c.recordings || []).map((r) => r.key)].filter(Boolean)
        for (const key of new Set(keys)) {
            console.log(`${apply ? "delete" : "would delete"}  ${key}`)
            files += 1
            if (apply) await deleteObject(RECORDINGS_BUCKET, key).catch((e) => console.error("  failed:", e.message))
        }
        if (apply && keys.length) { c.recordingFilename = null; c.recordings = []; changed = true }
    }
    if (changed) await drive.save()
}
console.log(`${apply ? "Removed" : "Would remove"} ${files} file(s) older than ${days} days.${apply ? "" : " Re-run with --apply to delete."}`)
await mongoose.disconnect()
