import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import net from "node:net"

// Drives the real Express app over HTTP against a throwaway local mongod. Skipped when mongod is not installed.
const hasMongod = spawnSync("mongod", ["--version"]).status === 0
const opts = { skip: hasMongod ? false : "mongod is not installed" }

let mongo, dbPath, server, base, mongoose
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)) }) })

before(async () => {
    if (!hasMongod) return
    dbPath = mkdtempSync(path.join(tmpdir(), "res-test-"))
    let port
    for (let attempt = 0; attempt < 6; attempt++) {
        port = await freePort()
        mongo = spawn("mongod", ["--dbpath", dbPath, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket"], { stdio: "ignore" })
        let exited = false
        mongo.on("exit", () => { exited = true })
        await new Promise((r) => setTimeout(r, 500))
        if (!exited) break
    }
    process.env.MONGODB_URL = `mongodb://127.0.0.1:${port}/res_test`
    process.env.ACCESS_TOKEN_SECRET = "test-secret"
    process.env.SERVICE_NAME = "client-service-test"
    process.env.COMMUNICATION_SERVICE_URL = "http://127.0.0.1:9"
    process.env.COMMUNICATION_SERVICE_API_KEY = "x"
    mongoose = (await import("mongoose")).default
    for (let i = 0; i < 60; i++) { try { await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 500 }); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
    const { default: app } = await import("../app.js")
    await new Promise((resolve) => { server = app.listen(0, resolve) })
    base = `http://127.0.0.1:${server.address().port}/api/v1`
})

after(async () => {
    server?.close()
    await mongoose?.disconnect()
    if (mongo) {
        const closed = new Promise((resolve) => { if (mongo.exitCode !== null) resolve(); else mongo.once("exit", resolve) })
        mongo.kill()
        await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 5000))])
    }
    try { if (dbPath) rmSync(dbPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* ignore */ }
})

const call = async (method, url, { token, body } = {}) => {
    const res = await fetch(`${base}${url}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const json = (res.headers.get("content-type") || "").includes("json") ? await res.json() : await res.text()
    return { status: res.status, json, data: json?.data, error: json?.error, meta: json?.meta }
}
const jwt = async (claims) => (await import("jsonwebtoken")).default.sign({ sub: "507f1f77bcf86cd799439011", email: "root@platform.test", ...claims }, process.env.ACCESS_TOKEN_SECRET)
const state = {}
const oid = () => new mongoose.Types.ObjectId()

test("set up: a test with two sections, ten multiple-choice questions and twelve finished candidates, eight of them near-identical", opts, async () => {
    const { default: Client } = await import("../models/client.model.js")
    const { OaAccount, OaAssessment, OaAttempt, OaStudent, OaDrive } = await import("../models/oa.model.js")
    state.tenant = oid()
    await Client.create({ onboardingId: oid(), registrationId: oid(), tenantId: state.tenant, type: "ORGANIZATION", name: "Nifco Test Co", status: "ACTIVE", primaryContact: { name: "O", email: "o@n.test", phone: "9876543210" } })
    const acc = await OaAccount.create({ orgName: "Nifco Test Co", contactName: "O", email: "oa@n.test", emailNormalized: "oa@n.test", passwordHash: "x", status: "ACTIVE", tenantId: String(state.tenant) })
    const drive = await OaDrive.create({ accountId: acc._id, title: "Campus Hiring" })
    const options = ["a", "b", "c", "d"].map((t, i) => ({ id: `o${i}`, text: t }))
    const q = (i, sectionId) => ({ id: `q${i}`, sectionId, type: "MCQ", text: `Question ${i}`, options, correct: ["o0"], marks: 2, difficulty: "MEDIUM" })
    const assessment = await OaAssessment.create({
        accountId: acc._id, title: "Aptitude Round 1", driveId: drive._id, roundNumber: 1, status: "PUBLISHED", sections: [{ id: "s1", title: "Aptitude" }, { id: "s2", title: "Reasoning" }],
        questions: [...[1, 2, 3, 4, 5].map((i) => q(i, "s1")), ...[6, 7, 8, 9, 10].map((i) => q(i, "s2")), { id: "q11", sectionId: "s2", type: "SHORT", text: "Explain", marks: 10 }],
        settings: { durationMinutes: 60, passPercent: 40 },
    })
    state.id = String(assessment._id)
    const answersFor = (right) => Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, { value: [i < right ? "o0" : "o2"] }]))     // wrong ones are all option c
    const gradesFor = (right) => Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, { marks: i < right ? 2 : 0, auto: true }]))
    const make = async (n, right, minutes, extra = {}) => {
        const student = await OaStudent.create({ accountId: acc._id, assessmentId: assessment._id, name: `Cand ${n}`, email: `c${n}@n.test`, emailNormalized: `c${n}@n.test`, codeHash: "h", codeEncrypted: "e" })
        const start = new Date("2026-11-26T08:00:00Z")
        await OaAttempt.create({ accountId: acc._id, assessmentId: assessment._id, studentId: student._id, status: "SUBMITTED", startedAt: start, deadline: new Date(start.getTime() + 3600000), submittedAt: new Date(start.getTime() + minutes * 60000), order: { sections: [{ sectionId: "s1", questionIds: ["q1", "q2", "q3", "q4", "q5"] }, { sectionId: "s2", questionIds: ["q6", "q7", "q8", "q9", "q10", "q11"] }] }, answers: answersFor(right), grades: gradesFor(right), score: right * 2, maxScore: 30, percent: Math.round((right * 2 / 30) * 1000) / 10, gradingStatus: "PENDING_REVIEW", ip: "10.0.0.5", ...extra })
    }
    for (let n = 1; n <= 8; n++) await make(n, 5, 6)         // eight candidates with the same answers, same wrong ones, in six minutes
    await make(9, 9, 40); await make(10, 2, 50); await make(11, 7, 35); await make(12, 0, 55)
    state.root = await jwt({ permissions: ["SETTINGS_WRITE"] }); state.hr = await jwt({ tenantId: String(state.tenant), permissions: ["CLIENT_SELF_READ"] })
})

test("only the platform owner can read these", opts, async () => {
    for (const url of ["/admin/oa-results/organizations", `/admin/oa-results/tests/${state.id}/results`, `/admin/oa-results/tests/${state.id}/insights`]) {
        assert.equal((await call("GET", url)).status, 401)
        assert.equal((await call("GET", url, { token: state.hr })).status, 403)
    }
    assert.equal((await call("GET", "/admin/oa-results/tests/not-an-id/paper", { token: state.root })).status, 404)
})

test("organizations, their tests, and the results sorted by score", opts, async () => {
    const orgs = (await call("GET", "/admin/oa-results/organizations", { token: state.root })).data
    const org = orgs.find((o) => o.name === "Nifco Test Co")
    assert.equal(org.tests, 1); assert.equal(org.finished, 12)
    const tests = (await call("GET", `/admin/oa-results/organizations/${org.key}/tests`, { token: state.root })).data
    assert.equal(tests[0].title, "Aptitude Round 1"); assert.equal(tests[0].drive, "Campus Hiring"); assert.equal(tests[0].finished, 12)
    const sorted = await call("GET", `/admin/oa-results/tests/${state.id}/results?sortBy=percent&order=desc&pageSize=100`, { token: state.root })
    assert.equal(sorted.status, 200)
    assert.equal(sorted.data[0].name, "Cand 9"); assert.equal(sorted.data[0].percent, 60)
    assert.deepEqual(sorted.data.slice(-1).map((r) => r.percent), [0])
    assert.equal(sorted.meta.summary.finished, 12)
    const filtered = await call("GET", `/admin/oa-results/tests/${state.id}/results?minPercent=30&pageSize=100`, { token: state.root })
    assert.ok(filtered.data.every((r) => r.percent >= 30))
})

test("a candidate's detail shows the sections, each answer and the marks", opts, async () => {
    const row = (await call("GET", `/admin/oa-results/tests/${state.id}/results?search=Cand 9`, { token: state.root })).data[0]
    const detail = (await call("GET", `/admin/oa-results/tests/${state.id}/attempts/${row.attemptId}`, { token: state.root })).data
    assert.equal(detail.student.name, "Cand 9")
    assert.deepEqual(detail.sections.map((s) => [s.title, s.questions.length]), [["Aptitude", 5], ["Reasoning", 6]])
    assert.equal(detail.sections[0].questions[0].grade.marks, 2)
    assert.equal(detail.attempt.percent, 60)
})

test("the paper: sections, question kinds, marks and what still needs marking", opts, async () => {
    const paper = (await call("GET", `/admin/oa-results/tests/${state.id}/paper`, { token: state.root })).data
    assert.equal(paper.totalQuestions, 11); assert.equal(paper.totalMarks, 30)
    assert.deepEqual(paper.autoMarked, { questions: 10, marks: 20 }); assert.deepEqual(paper.needsReview, { questions: 1, marks: 10 })
    assert.deepEqual(paper.sections.map((s) => [s.title, s.questionCount, s.marks]), [["Aptitude", 5, 10], ["Reasoning", 6, 20]])
    assert.deepEqual(paper.sections[1].types.map((t) => [t.type, t.count]).sort(), [["MCQ", 5], ["SHORT", 1]])
    assert.equal(paper.durationMinutes, 60); assert.equal(paper.passPercent, 40)
})

test("the score check flags identical scores, matching wrong answers, fast finishers and unmarked written answers", opts, async () => {
    const ins = (await call("GET", `/admin/oa-results/tests/${state.id}/insights`, { token: state.root })).data
    assert.equal(ins.verdict, "CONCERN")
    assert.equal(ins.basedOn.attempts, 12)
    assert.equal(ins.repeatedScores[0].count, 8)
    const text = ins.notes.map((n) => n.text).join(" | ")
    assert.match(text, /8 of 12 candidates .* scored exactly/)
    assert.match(text, /almost the same multiple-choice answers/)
    assert.match(text, /still being marked by AI/)
    assert.ok(ins.similarAnswers.length >= 1); assert.ok(ins.similarAnswers[0].identicalWrong >= 3)
    assert.equal(ins.sharedNetwork[0].count, 12)
    assert.ok(ins.spread.average > 30 && ins.spread.average < 35)
    assert.equal(ins.questions.length, 11)
    // question 1 was answered correctly by 11 of 12 (the zero-scorer got it wrong): a real percentage, not a guess
    const q1 = ins.questions.find((x) => x.id === "q1"); assert.equal(q1.fullMarksRate, 91.7)
})

test("a candidate's AI interview report: for the platform owner, or for the organization's own drive only", opts, async () => {
    const { InterviewDrive } = await import("../models/interviewDrive.model.js")
    const other = oid()
    const drive = await InterviewDrive.create({ tenantId: String(state.tenant), title: "Nifco AI", roleCategory: "X", department: "Y", experienceLevel: "Z", expiryDate: new Date("2027-01-01"), rounds: [{ roundNumber: 1, title: "R1", type: "T", candidates: [{ name: "AI Cand", email: "ai@n.test", status: "COMPLETED", aiScore: 48, agentInterviewId: "iv1", agentReport: { final_score: 48.5, competency_scores: { Communication: 60 }, content: { overall: { summary: "Fair answers", recommendation: "no_hire" } } }, violations: [{ reason: "x", snapshot: "secret-path" }] }] }] })
    const q = `driveId=${drive._id}&email=AI@n.test`
    const asOwner = await call("GET", `/admin/oa-results/ai-candidate?${q}`, { token: state.root })
    assert.equal(asOwner.status, 200); assert.equal(asOwner.data.aiScore, 48); assert.equal(asOwner.data.agentReport.content.overall.summary, "Fair answers")
    assert.equal(JSON.stringify(asOwner.data).includes("secret-path"), false)                                 // no screenshots, recordings or transcript
    assert.equal((await call("GET", `/admin/oa-results/ai-candidate?${q}`, { token: state.hr })).status, 403)  // an organization cannot use the platform route
    const mine = await call("GET", `/organization/billing/ai-candidate?${q}`, { token: state.hr })
    assert.equal(mine.status, 200); assert.equal(mine.data.name, "AI Cand")
    const stranger = await jwt({ tenantId: String(other), permissions: ["CLIENT_SELF_READ"] })
    assert.equal((await call("GET", `/organization/billing/ai-candidate?${q}`, { token: stranger })).status, 404)    // another organization's candidate is not reachable
    assert.equal((await call("GET", `/admin/oa-results/ai-candidate?driveId=${drive._id}&email=nobody@x.test`, { token: state.root })).status, 404)
})
