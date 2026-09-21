/**
 * Keeps a ready-to-run "Demo AI Interview" for one candidate, so the interview modal / room can be tested
 * at any time without waiting for a real slot.
 *
 *   npm run demo:interview                          # for the default demo candidate
 *   npm run demo:interview -- someone@example.com   # for another candidate who already has a drive
 *
 * Safe to run repeatedly: it updates the same drive (matched by tenant + title) and resets the candidate
 * to a fresh, live-now interview - slot in 5 minutes (inside the 10-min-early / 90-min-late window), no
 * previous attempt, and no cached agent interview, so a brand-new one is created on Start.
 * Development helper only - it refuses to run with NODE_ENV=production.
 */
import "dotenv/config"
import mongoose from "mongoose"
import { InterviewDrive } from "../models/interviewDrive.model.js"

const DEMO_TITLE = "Demo AI Interview"
const email = (process.argv[2] || process.env.DEMO_CANDIDATE_EMAIL || "agrima.agarwal.23cse@bmu.edu.in").toLowerCase().trim()
const DAY = 24 * 3600 * 1000

const run = async () => {
    if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed a demo interview in production.")
    await mongoose.connect(process.env.MONGODB_URL)

    // The organization (tenant) and a resume already on file come from the candidate's existing drives.
    const known = await InterviewDrive.find({ "rounds.candidates.email": email }).sort({ createdAt: -1 }).limit(20)
    if (!known.length) throw new Error(`No drive found for ${email} - invite them to a drive first so the demo joins the right organization.`)
    const tenantId = known[0].tenantId
    const sample = known.flatMap((d) => d.rounds.flatMap((r) => r.candidates)).find((c) => c.email === email && c.resumeFilename)

    const now = Date.now()
    const fresh = {
        name: sample?.name || "Demo Candidate", email, phone: sample?.phone, exp: sample?.exp || "2",
        status: "SCHEDULED", interviewSlot: new Date(now + 5 * 60 * 1000), attemptedDate: undefined, aiScore: 0, malpracticeFlags: 0,
        resumeFilename: sample?.resumeFilename || null, resumeOriginalName: sample?.resumeOriginalName || "resume.pdf",
        preferredLanguage: sample?.preferredLanguage || "en", violations: [],
        agentInterviewId: null, agentReport: null, recordingFilename: null,
    }
    const period = { startDate: new Date(now - DAY), expiryDate: new Date(now + 30 * DAY) }

    let drive = await InterviewDrive.findOne({ tenantId, title: DEMO_TITLE })
    if (!drive) {
        drive = new InterviewDrive({
            tenantId, title: DEMO_TITLE, roleCategory: "SOFTWARE_ENGINEERING", department: "Engineering",
            experienceLevel: "1-3 yrs (Junior)", roundType: "Technical", status: "ACTIVE", ...period,
            rounds: [{ roundNumber: 1, title: "Round 1: Demo Interview", type: "Technical", status: "ACTIVE", ...period, candidates: [fresh] }],
        })
    } else {
        const round = drive.rounds[0]
        drive.status = "ACTIVE"
        drive.startDate = period.startDate
        drive.expiryDate = period.expiryDate
        round.status = "ACTIVE"
        round.startDate = period.startDate
        round.expiryDate = period.expiryDate
        const existing = round.candidates.find((c) => c.email === email)
        if (existing) Object.assign(existing, fresh)
        else round.candidates.push(fresh)
    }
    await drive.save()
    console.log(`Demo interview ready for ${email}
  drive:  "${DEMO_TITLE}" (${drive._id}) in organization ${tenantId}
  slot:   ${fresh.interviewSlot.toLocaleString()} (live now - Start AI Interview is enabled)
  resume: ${fresh.resumeFilename ? "reused from an earlier application" : "none on file (upload one in the portal)"}
Sign in to the candidate portal as ${email} and open the "${DEMO_TITLE}" card.`)
    await mongoose.disconnect()
}

run().catch(async (err) => {
    console.error("Could not seed the demo interview:", err.message)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
})
