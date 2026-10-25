/**
 * Creates (or refreshes) a demo COLLEGE account so the college workflow can be tried without going through
 * registration, onboarding and approval first.
 *
 *   node scripts/seed-demo-college.js                       # default demo college, random password (printed once)
 *   node scripts/seed-demo-college.js me@example.com 'Pw…'  # your own login email / password
 *
 * It creates, in the same databases the services use:
 *   1. a Client (type COLLEGE, ACTIVE) in the client-service database
 *   2. its login (CLIENT_ADMIN, tenant = that client) in the auth-service database
 *   3. a campus question set the college can pick when creating an exam
 *   4. one sample exam with a handful of sample students (example.test addresses - nothing is ever emailed to them)
 *      so the results screens have something to show
 *
 * Safe to run repeatedly: the client, login and sample exam are matched and reused, never duplicated. An existing
 * login keeps its password unless one is passed on the command line. Development helper only - it refuses to run
 * with NODE_ENV=production.
 */
import "dotenv/config"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import mongoose from "mongoose"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import User from "../models/user.model.js"

if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run with NODE_ENV=production.")
    process.exit(1)
}

const here = path.dirname(fileURLToPath(import.meta.url))
const clientEnv = dotenv.parse(fs.readFileSync(path.resolve(here, "../../client-service/.env")))
const EMAIL = String(process.argv[2] || "college.demo@workmateiq.local").trim().toLowerCase()
const PASSWORD_ARG = process.argv[3]
const COLLEGE_NAME = "Demo College of Engineering"
const EXAM_TITLE = "Sample: Mock Placement Interview"
const BANK_TITLE = "Campus Placement Fundamentals"
const CAMPUS_QUESTIONS = [
    ["Tell me about yourself, your branch and the projects you are proudest of.", "Introduction"],
    ["Explain a technical concept from your coursework as if to a first-year student.", "Fundamentals"],
    ["Describe a project where something went wrong and how you handled it.", "Problem solving"],
    ["How would you approach learning a technology you have never used before?", "Learning ability"],
    ["Tell me about a time you worked in a team and disagreed with someone.", "Teamwork"],
    ["Where do you see yourself in three years and why does this role fit that?", "Career goals"],
]

const addDays = (n) => new Date(Date.now() + n * 86400000)
const oid = () => new mongoose.Types.ObjectId()

const SAMPLE_STUDENTS = [
    ["Aarav Mehta", "21CS001", "Computer Science & Engineering", "COMPLETED", 86, 0],
    ["Diya Nair", "21CS014", "Computer Science & Engineering", "COMPLETED", 72, 0],
    ["Rohan Kulkarni", "21CS027", "Computer Science & Engineering", "COMPLETED", 48, 1],
    ["Sneha Pillai", "21IT009", "Information Technology", "COMPLETED", 91, 0],
    ["Vikram Rao", "21IT022", "Information Technology", "COMPLETED", 63, 2],
    ["Ishita Bansal", "21EC005", "Electronics & Communication", "SCHEDULED", 0, 0],
    ["Karan Malhotra", "21EC018", "Electronics & Communication", "INVITED", 0, 0],
    ["Meera Joshi", "21ME003", "Mechanical Engineering", "INVITED", 0, 0],
].map(([name, rollNumber, branch, status, score, flags], i) => ({
    id: `sample-student-${i + 1}`,
    name,
    email: `sample.student${i + 1}@example.test`,
    rollNumber,
    branch,
    batch: "2025",
    status,
    aiScore: score,
    malpracticeFlags: flags,
    attemptedDate: status === "COMPLETED" ? addDays(-(i % 4) - 1) : undefined,
    agentReport: status === "COMPLETED" ? { final_score: score, sample: true } : null,
    violations: [],
    preferredLanguage: "en",
    demoAlwaysLive: false,
}))

const clientConn = await mongoose.createConnection(clientEnv.MONGODB_URL).asPromise()
await mongoose.connect(process.env.MONGODB_URL)

try {
    // 1. the college
    const clients = clientConn.collection("clients")
    let client = await clients.findOne({ "primaryContact.email": EMAIL, type: "COLLEGE" })
    if (!client) {
        const doc = {
            onboardingId: oid(), registrationId: oid(), tenantId: null, type: "COLLEGE", name: COLLEGE_NAME,
            primaryContact: { name: "Demo Admin", email: EMAIL, phone: "9000000000" },
            branding: { logoFileId: null, logoUrl: null, primaryColor: "#7A1F3D", secondaryColor: "#E6B325", fontFamily: null },
            smtp: { encryption: "TLS", configured: false },
            status: "ACTIVE", subdomain: "demo-college", createdAt: new Date(), updatedAt: new Date(),
        }
        const { insertedId } = await clients.insertOne(doc)
        client = { ...doc, _id: insertedId }
        console.log("created college:", COLLEGE_NAME)
    } else {
        console.log("college already exists:", client.name)
    }
    const tenantId = String(client._id)

    // 2. its login
    const normalized = EMAIL
    let user = await User.findOne({ emailNormalized: normalized })
    let shownPassword = null
    if (!user) {
        shownPassword = PASSWORD_ARG || crypto.randomBytes(9).toString("base64url")
        user = await User.create({
            email: EMAIL, emailNormalized: normalized, displayName: "Demo College Admin",
            passwordHash: await bcrypt.hash(shownPassword, 10),
            roles: ["CLIENT_ADMIN"], tenantId: client._id, mustChangePassword: false,
        })
        console.log("created login")
    } else {
        user.roles = [...new Set([...(user.roles || []), "CLIENT_ADMIN"])]
        user.tenantId = client._id
        user.mustChangePassword = false
        user.status = "ACTIVE"
        if (PASSWORD_ARG) { user.passwordHash = await bcrypt.hash(PASSWORD_ARG, 10); shownPassword = PASSWORD_ARG }
        await user.save()
        console.log("login already existed - linked to the college" + (PASSWORD_ARG ? " and password reset" : " (password unchanged)"))
    }

    // 3. a campus question set
    const banks = clientConn.collection("questionbanks")
    if (!(await banks.findOne({ tenantId, title: BANK_TITLE }))) {
        const now = new Date()
        await banks.insertOne({
            tenantId, title: BANK_TITLE, category: "CAMPUS_PLACEMENT", questionCount: CAMPUS_QUESTIONS.length, durationMinutes: 20, isSystemDefault: false,
            questions: CAMPUS_QUESTIONS.map(([text, topic], i) => ({ id: `campus-q${i + 1}`, text, topic, timeLimit: 120 })),
            createdAt: now, updatedAt: now,
        })
        console.log("created question set:", BANK_TITLE)
    }

    // 4. a sample exam with sample students
    const drives = clientConn.collection("interviewdrives")
    const existing = await drives.findOne({ tenantId, title: EXAM_TITLE })
    if (!existing) {
        const now = new Date()
        const rubrics = [
            { id: 1, name: "Domain Knowledge & Technical Competency", weight: 35 }, { id: 2, name: "Problem Solving & Analytical Thinking", weight: 25 },
            { id: 3, name: "Communication & Soft Skills", weight: 25 }, { id: 4, name: "Confidence & Clarity", weight: 15 },
        ]
        await drives.insertOne({
            tenantId, driveKind: "EXAM", title: EXAM_TITLE, roleCategory: "CAMPUS_PLACEMENT", department: "Computer Science & Engineering",
            experienceLevel: "0-1 yr (Fresher)", totalRounds: 1, currentRound: 1, roundType: "Technical", startDate: addDays(-3), expiryDate: addDays(11),
            status: "ACTIVE", questionMode: "PREBUILT", questions: [], customQuestionsList: [], skillRubrics: rubrics, passingThreshold: 60,
            interviewMode: "VIDEO", enablePublicLink: true, publicLink: crypto.randomBytes(6).toString("hex"), candidatesCount: SAMPLE_STUDENTS.length,
            rounds: [{
                _id: oid(), roundNumber: 1, title: "Round 1", type: "Technical", status: "ACTIVE", startDate: addDays(-3), expiryDate: addDays(11),
                passingThreshold: 60, skillRubrics: rubrics, questionMode: "PREBUILT", questions: [], customQuestions: [],
                candidates: SAMPLE_STUDENTS, createdAt: now,
            }],
            createdAt: now, updatedAt: now,
        })
        console.log(`created sample exam with ${SAMPLE_STUDENTS.length} sample students`)
    } else {
        console.log("sample exam already exists")
    }

    console.log("\n--- demo college login ---")
    console.log("email:   ", EMAIL)
    console.log("password:", shownPassword || "(unchanged - pass one as the second argument to reset it)")
} finally {
    await clientConn.close()
    await mongoose.disconnect()
}
