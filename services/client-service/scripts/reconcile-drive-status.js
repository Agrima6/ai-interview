/**
 * One-off reconciliation for the Completed / Closed distinction.
 *
 * Before it existed, a recruiter pressing "Close drive" or "Complete round" stored COMPLETED even when
 * candidates had never taken the interview. This marks such rounds/drives CLOSED instead.
 *
 *   node scripts/reconcile-drive-status.js            # dry run: lists what would change
 *   node scripts/reconcile-drive-status.js --apply    # writes the changes
 *
 * Only ever COMPLETED -> CLOSED, and only where candidates are still INVITED/SCHEDULED. Nothing else is touched.
 */
import "dotenv/config"
import mongoose from "mongoose"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { countUnfinishedCandidates } from "../services/interviewDrive.service.js"

const apply = process.argv.includes("--apply")
await mongoose.connect(process.env.MONGODB_URL)
let rounds = 0, drives = 0
for await (const drive of InterviewDrive.find({ $or: [{ status: "COMPLETED" }, { "rounds.status": "COMPLETED" }] })) {
    let changed = false
    for (const round of drive.rounds) {
        if (round.status === "COMPLETED" && countUnfinishedCandidates(round) > 0) {
            console.log(`round  ${drive._id} R${round.roundNumber} "${drive.title}": ${countUnfinishedCandidates(round)} unfinished -> CLOSED`)
            round.status = "CLOSED"; rounds += 1; changed = true
        }
    }
    if (drive.status === "COMPLETED" && drive.rounds.some((r) => r.status === "CLOSED")) {
        console.log(`drive  ${drive._id} "${drive.title}" -> CLOSED`)
        drive.status = "CLOSED"; drives += 1; changed = true
    }
    if (changed && apply) await drive.save()
}
console.log(`${apply ? "Applied" : "Would change"}: ${rounds} round(s), ${drives} drive(s).${apply ? "" : "  Re-run with --apply to write."}`)
await mongoose.disconnect()
