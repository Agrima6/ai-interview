import "dotenv/config"
import mongoose from "mongoose"
import connectDb from "../config/connectDb.js"
import { OaAccount, OaAssessment, OaAttempt, OaEvent, OaStudent } from "../models/oa.model.js"
import { hashAccessCode, hashPassword, normalizeEmail } from "../utils/oaSecurity.js"
import { encryptSecret } from "../utils/crypto.js"
import { normalizeQuestions, newId } from "../utils/oaQuestions.js"

// Test data for Online Assessment: an approved organizer, a test that is open right now, and three students.
// Re-running resets the demo (attempts are wiped, the test reopens), so it can be demonstrated over and over.
//
//   node scripts/seed-oa-demo.js
//
// It writes to whatever MONGODB_URL points at, so it refuses to run with NODE_ENV=production.

export const DEMO = {
    admin: { email: "oa.demo@workmateiq.test", password: "OaDemo#2026", orgName: "Demo Institute of Technology", contactName: "Demo Organizer" },
    students: [
        { name: "Asha Verma", email: "asha.demo@workmateiq.test", rollNumber: "DEMO-001", code: "DEMO2026A" },
        { name: "Rahul Mehta", email: "rahul.demo@workmateiq.test", rollNumber: "DEMO-002", code: "DEMO2026B" },
        { name: "Meera Iyer", email: "meera.demo@workmateiq.test", rollNumber: "DEMO-003", code: "DEMO2026C" },
    ],
    title: "Demo Assessment · Campus Round 1",
}

const mcq = (text, options, correct, marks = 2, extra = {}) => ({ type: "MCQ", text, options, correct, marks, negativeMarks: 0.5, ...extra })

const run = async () => {
    if (process.env.NODE_ENV === "production") {
        console.error("Refusing to seed demo data with NODE_ENV=production.")
        process.exit(1)
    }
    await connectDb()
    const host = (process.env.MONGODB_URL || "").replace(/\/\/[^@]*@/, "//***@").replace(/\?.*$/, "")
    console.log(`Seeding into ${host}`)

    const emailNormalized = normalizeEmail(DEMO.admin.email)
    const account = await OaAccount.findOneAndUpdate({ emailNormalized }, {
        $set: { orgName: DEMO.admin.orgName, contactName: DEMO.admin.contactName, email: DEMO.admin.email, emailNormalized, passwordHash: hashPassword(DEMO.admin.password), status: "ACTIVE", review: { reviewedBy: "seed", reviewedAt: new Date(), note: "Demo account" } },
    }, { upsert: true, new: true, setDefaultsOnInsert: true })

    const previous = await OaAssessment.find({ accountId: account._id, title: DEMO.title }).select("_id")
    const ids = previous.map((a) => a._id)
    if (ids.length) {
        const attempts = await OaAttempt.find({ assessmentId: { $in: ids } }).select("_id")
        await OaEvent.deleteMany({ attemptId: { $in: attempts.map((a) => a._id) } })
        await Promise.all([OaAttempt.deleteMany({ assessmentId: { $in: ids } }), OaStudent.deleteMany({ assessmentId: { $in: ids } }), OaAssessment.deleteMany({ _id: { $in: ids } })])
    }

    const sections = [{ id: newId(), title: "Aptitude" }, { id: newId(), title: "Written" }, { id: newId(), title: "Coding" }]
    const [apt, written, coding] = sections.map((s) => s.id)
    const raw = [
        mcq("What is 15% of 200?", ["20", "25", "30", "35"], "C", 2, { sectionId: apt }),
        mcq("A train covers 120 km in 2 hours. Its speed in km/h is:", ["50", "60", "70", "80"], "B", 2, { sectionId: apt }),
        mcq("Which number comes next: 2, 6, 12, 20, ?", ["28", "30", "32", "36"], "B", 2, { sectionId: apt }),
        mcq("If 3x + 5 = 20, then x is:", ["3", "4", "5", "6"], "C", 2, { sectionId: apt }),
        mcq("Which data structure works on a LIFO basis?", ["Queue", "Stack", "Array", "Tree"], "B", 2, { sectionId: apt }),
        mcq("The time complexity of binary search is:", ["O(n)", "O(n log n)", "O(log n)", "O(1)"], "C", 2, { sectionId: apt }),
        { type: "MSQ", text: "Which of these are prime numbers?", options: ["2", "4", "5", "9"], correct: "A;C", marks: 3, negativeMarks: 1, sectionId: apt },
        { type: "MSQ", text: "Which of these are programming languages?", options: ["Python", "HTML", "Java", "Go"], correct: "A;C;D", marks: 3, negativeMarks: 1, sectionId: apt },
        { type: "SHORT", text: "In one or two sentences, what is a database index and why is it used?", keywords: ["lookup;speed;query"], marks: 4, modelAnswer: "A data structure that speeds up lookups at the cost of extra storage and slower writes.", sectionId: written },
        { type: "LONG", text: "Explain normalisation in databases. Give a short example of moving a table from 1NF to 3NF.", marks: 10, modelAnswer: "Looks for: redundancy, update anomalies, 1NF/2NF/3NF definitions, a worked example.", sectionId: written },
        { type: "CODING", text: "Read two integers from the input and print their sum.\n\nInput: two space-separated integers.\nOutput: a single integer.", marks: 15, codeLanguages: ["python", "javascript", "java"], testCases: [{ input: "2 3", expected: "5" }, { input: "-4 10", expected: "6", hidden: true }], modelAnswer: "print(sum(map(int, input().split())))", sectionId: coding },
    ]
    const { accepted, rejected } = normalizeQuestions(raw.map((q) => ({ ...q, correct: q.correct, keywords: q.keywords?.[0] })), { sectionIds: sections.map((s) => s.id), defaultSectionId: apt, source: "MANUAL" })
    if (rejected.length) throw new Error(`Seed questions invalid: ${JSON.stringify(rejected)}`)

    const now = Date.now()
    const assessment = await OaAssessment.create({
        accountId: account._id, title: DEMO.title, roundLabel: "Round 1", status: "PUBLISHED", publishedAt: new Date(),
        description: "A short demo test with multiple choice, written and coding questions.",
        instructions: "Read each question carefully. You may change answers until you submit. Good luck!",
        schedule: { startAt: new Date(now - 60 * 1000), endAt: new Date(now + 6 * 3600 * 1000), durationMinutes: 45, lateEntryMinutes: 120, timezone: "Asia/Kolkata" },
        settings: { shuffleQuestions: true, shuffleOptions: true, shuffleSections: false, allowBackNavigation: true, passPercent: 40, showResultToStudent: true },
        proctoring: { level: "HARD", requireCamera: true, requireScreenShare: true, requireFullscreen: true, faceChecks: true, blockCopyPaste: true, maxViolations: 5, snapshotIntervalSec: 30 },
        sections, questions: accepted,
    })
    await OaStudent.insertMany(DEMO.students.map((s) => ({
        accountId: account._id, assessmentId: assessment._id, name: s.name, email: s.email, emailNormalized: normalizeEmail(s.email), rollNumber: s.rollNumber,
        codeHash: hashAccessCode(s.code), codeEncrypted: encryptSecret(s.code), details: { branch: "CSE", batch: "2026" },
    })))

    console.log("\nOnline Assessment demo is ready.\n")
    console.log("Organizer (sign in at /oa/login)")
    console.log(`  email:    ${DEMO.admin.email}\n  password: ${DEMO.admin.password}\n`)
    console.log(`Students (sign in at /oa/exam?a=${assessment._id})`)
    for (const s of DEMO.students) console.log(`  ${s.name.padEnd(12)} ${s.email}   code: ${s.code}`)
    console.log(`\nThe test "${DEMO.title}" is open for the next 6 hours. Run this script again to reset it.`)
    await mongoose.disconnect()
}

run().catch((error) => { console.error(error); process.exit(1) })
