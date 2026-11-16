import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import net from "node:net"

// Drives the real Express app over HTTP against a throwaway local mongod. Skipped when mongod is not installed,
// so `npm test` still passes on machines (and CI images) without it.
const hasMongod = spawnSync("mongod", ["--version"]).status === 0
const opts = { skip: hasMongod ? false : "mongod is not installed" }

let mongo, dbPath, server, base, mongoose, models, exam
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)) }) })

before(async () => {
    if (!hasMongod) return
    dbPath = mkdtempSync(path.join(tmpdir(), "oa-test-"))
    const port = await freePort()
    mongo = spawn("mongod", ["--dbpath", dbPath, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket"], { stdio: "ignore" })
    process.env.MONGODB_URL = `mongodb://127.0.0.1:${port}/oa_test`
    process.env.ACCESS_TOKEN_SECRET = "test-secret"
    process.env.SERVICE_NAME = "client-service-test"
    process.env.COMMUNICATION_SERVICE_URL = "http://127.0.0.1:9"
    process.env.COMMUNICATION_SERVICE_API_KEY = "x"
    mongoose = (await import("mongoose")).default
    for (let i = 0; i < 60; i++) { try { await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 500 }); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
    models = await import("../models/oa.model.js")
    exam = await import("../services/oaExam.service.js")
    const { default: app } = await import("../app.js")
    await new Promise((resolve) => { server = app.listen(0, resolve) })
    base = `http://127.0.0.1:${server.address().port}/api/v1`
})

after(async () => {
    server?.close()
    await mongoose?.disconnect()
    mongo?.kill()
    if (dbPath) rmSync(dbPath, { recursive: true, force: true })
})

const call = async (method, url, { token, body } = {}) => {
    const res = await fetch(`${base}${url}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const type = res.headers.get("content-type") || ""
    const json = type.includes("json") ? await res.json() : await res.text()
    return { status: res.status, json, data: json?.data, error: json?.error }
}

// platform tokens are signed with the platform secret; the OA room must refuse them
const platformToken = async (permissions) => (await import("jsonwebtoken")).default.sign({ sub: "507f1f77bcf86cd799439011", permissions }, process.env.ACCESS_TOKEN_SECRET)

const state = {}

test("maker-checker: an applicant cannot sign in until a super admin approves", opts, async () => {
    const weak = await call("POST", "/oa/auth/register", { body: { orgName: "Acme", contactName: "A", email: "owner@acme.test", password: "short" } })
    assert.equal(weak.status, 400)

    const reg = await call("POST", "/oa/auth/register", { body: { orgName: "Acme College", contactName: "Ana Owner", email: "Owner@Acme.test", password: "Sup3rSecret" } })
    assert.equal(reg.status, 200)
    state.accountId = reg.data.id
    assert.equal(reg.data.status, "PENDING")

    assert.equal((await call("POST", "/oa/auth/register", { body: { orgName: "Acme College", contactName: "Ana", email: "owner@acme.test", password: "Sup3rSecret" } })).status, 409)
    assert.equal((await call("POST", "/oa/auth/login", { body: { email: "owner@acme.test", password: "wrong-password1" } })).error.code, "INVALID_CREDENTIALS")
    const pending = await call("POST", "/oa/auth/login", { body: { email: "owner@acme.test", password: "Sup3rSecret" } })
    assert.equal(pending.status, 403)
    assert.equal(pending.error.code, "ACCOUNT_PENDING")

    // checker endpoints need a platform token with the approve permission
    assert.equal((await call("GET", "/oa/platform/accounts")).status, 401)
    const noPerm = await platformToken([])
    assert.equal((await call("GET", "/oa/platform/accounts", { token: noPerm })).status, 403)
    const checker = await platformToken(["CLIENT_APPROVE"])
    state.checker = checker
    const list = await call("GET", "/oa/platform/accounts?status=PENDING", { token: checker })
    assert.equal(list.data.length, 1)

    assert.equal((await call("POST", `/oa/platform/accounts/${state.accountId}/reject`, { token: checker, body: {} })).status, 400)   // a reason is required
    const approved = await call("POST", `/oa/platform/accounts/${state.accountId}/approve`, { token: checker })
    assert.equal(approved.data.status, "ACTIVE")
    assert.equal((await call("POST", `/oa/platform/accounts/${state.accountId}/approve`, { token: checker })).status, 409)   // already decided

    const login = await call("POST", "/oa/auth/login", { body: { email: "OWNER@acme.test", password: "Sup3rSecret" } })
    assert.equal(login.status, 200)
    state.admin = login.data.token
})

test("a platform token is not accepted in the OA room, nor an OA token on the platform", opts, async () => {
    const platform = await platformToken(["CLIENT_APPROVE", "CLIENT_SELF_READ"])
    assert.equal((await call("GET", "/oa/me", { token: platform })).status, 401)
    assert.equal((await call("GET", "/oa/platform/accounts", { token: state.admin })).status, 401)
    assert.equal((await call("GET", "/oa/exam/session", { token: state.admin })).status, 403)   // an admin is not a student
})

test("build a test: sections, manual questions, a CSV-style upload with a bad row, and the AI switch", opts, async () => {
    const created = await call("POST", "/oa/assessments", { token: state.admin, body: { title: "Campus Drive Round 1" } })
    assert.equal(created.status, 200)
    state.a = created.data.id
    state.section1 = created.data.sections[0].id

    const sections = await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { sections: [{ id: state.section1, title: "Aptitude" }, { title: "Written" }, { title: "Coding" }] } })
    assert.equal(sections.data.sections.length, 3)
    state.sections = sections.data.sections.map((s) => s.id)

    const mcqs = Array.from({ length: 12 }, (_, i) => ({ type: "MCQ", text: `Aptitude question ${i + 1}`, options: ["one", "two", "three", "four"], correct: "C", marks: 2, negativeMarks: 0.5, sectionId: state.sections[0] }))
    const upload = await call("POST", `/oa/assessments/${state.a}/questions`, { token: state.admin, body: { source: "UPLOAD", questions: [...mcqs, { type: "MCQ", text: "broken", options: ["only one"], correct: "A" }] } })
    assert.equal(upload.data.added, 12)
    assert.equal(upload.data.rejected[0].row, 13)

    const written = await call("POST", `/oa/assessments/${state.a}/questions`, { token: state.admin, body: { questions: [
        { type: "SHORT", text: "Define an index", keywords: ["lookup", "speed"], marks: 4, sectionId: state.sections[1] },
        { type: "LONG", text: "Discuss normalisation", marks: 10, sectionId: state.sections[1] },
        { type: "CODING", text: "Add two numbers", marks: 20, sectionId: state.sections[2], testCases: [{ input: "1 2", expected: "3" }] },
    ] } })
    assert.equal(written.data.added, 3)

    const ai = await call("POST", `/oa/assessments/${state.a}/questions/generate`, { token: state.admin, body: { prompt: "Basic SQL for freshers" } })
    assert.equal(ai.status, 503)
    assert.equal(ai.error.code, "AI_NOT_CONFIGURED")   // off, with a clear reason, when no key is set

    const full = await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })
    assert.equal(full.data.questionCount, 15)
    assert.equal(full.data.totalMarks, 12 * 2 + 4 + 10 + 20)
})

test("publishing is refused until the test is ready", opts, async () => {
    const early = await call("POST", `/oa/assessments/${state.a}/publish`, { token: state.admin })
    assert.equal(early.status, 400)    // no schedule yet
    const soon = Date.now()
    const bad = await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { schedule: { startAt: new Date(soon + 3600e3), endAt: new Date(soon + 3700e3), durationMinutes: 60 } } })
    assert.equal(bad.status, 400)      // closes before one full duration fits
    assert.equal(bad.error.fields.endAt !== undefined, true)
})

test("students: upload, duplicates, then publish and the invite is idempotent", opts, async () => {
    const people = Array.from({ length: 4 }, (_, i) => ({ name: `Student ${"ABCD"[i]}`, email: `s${i + 1}@college.test`, rollNumber: `R${i + 1}`, details: { branch: "CSE" } }))
    const added = await call("POST", `/oa/assessments/${state.a}/students`, { token: state.admin, body: { students: [...people, { name: "Dup", email: "S1@college.test" }, { name: "", email: "x@y.test" }, { name: "Bad", email: "not-an-email" }, { name: "Owner Too", email: "owner@acme.test" }] } })
    assert.equal(added.data.added, 5)      // the OA admin's own email is allowed as a student: the identities are separate
    assert.equal(added.data.skipped.length, 3)

    const open = Date.now() - 60e3
    const sched = await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { schedule: { startAt: new Date(open), endAt: new Date(open + 3 * 3600e3), durationMinutes: 60, lateEntryMinutes: 30 }, settings: { passPercent: 50, showResultToStudent: true }, proctoring: { maxViolations: 3 } } })
    assert.equal(sched.status, 200)
    assert.equal(sched.data.proctoring.maxViolations, 3)

    const pub = await call("POST", `/oa/assessments/${state.a}/publish`, { token: state.admin })
    assert.equal(pub.data.status, "PUBLISHED")

    const invite = await call("POST", `/oa/assessments/${state.a}/students/invite`, { token: state.admin })
    assert.equal(invite.data.attempted, 5)
    assert.equal(invite.data.failed.length, 5)     // no mail service in the test: failures are reported, nothing throws
    const list = await call("GET", `/oa/assessments/${state.a}/students?pageSize=100`, { token: state.admin })
    state.students = list.data
    assert.equal(list.json.meta.total, 5)
    assert.match(list.data[0].accessCode, /^[A-Z0-9]{8}$/)
    assert.equal(list.data[0].invite.status, "FAILED")
})

test("a student signs in with email + code only, and only for their own test", opts, async () => {
    const [s1] = state.students
    const wrong = await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email: s1.email, code: "ZZZZZZZZ" } })
    assert.equal(wrong.status, 401)
    const stranger = await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email: "nobody@x.test", code: s1.accessCode } })
    assert.equal(stranger.status, 401)
    assert.equal(stranger.error.message, wrong.error.message)      // the form cannot be used to discover who is invited

    for (const s of state.students) {
        const login = await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email: s.email.toUpperCase(), code: s.accessCode.toLowerCase() } })
        assert.equal(login.status, 200, s.email)
        s.token = login.data.token
    }
})

test("the exam: each student gets their own order, and never sees the answer key", opts, async () => {
    const [s1, s2] = state.students
    const sess = await call("GET", "/oa/exam/session", { token: s1.token })
    assert.equal(sess.data.assessment.phase, "OPEN")
    assert.equal(sess.data.canStart, true)
    assert.equal(sess.data.attempt, null)
    assert.equal((await call("GET", "/oa/exam/paper", { token: s1.token })).status, 409)      // cannot read the paper before starting

    const env = { userAgent: "test", screenCount: 1, latitude: 12.9716, longitude: 77.5946, accuracy: 20, browser: "Chrome 130", os: "macOS", device: "Desktop" }
    // New rounds ask for the candidate's location: starting without it is refused, and says why.
    const noPlace = await call("POST", "/oa/exam/start", { token: s1.token, body: { environment: { userAgent: "test" } } })
    assert.equal(noPlace.status, 409)
    assert.equal(noPlace.error.code, "LOCATION_REQUIRED")
    const p1 = await call("POST", "/oa/exam/start", { token: s1.token, body: { environment: env } })
    const p2 = await call("POST", "/oa/exam/start", { token: s2.token, body: { environment: env } })
    assert.equal(p1.status, 200)
    const ids = (p) => p.data.sections.flatMap((s) => s.questions.map((q) => q.id))
    assert.equal(ids(p1).length, 15)
    assert.notDeepEqual(ids(p1), ids(p2))
    assert.deepEqual([...ids(p1)].sort(), [...ids(p2)].sort())
    const raw = JSON.stringify(p1.json)
    for (const secret of ["correct", "modelAnswer", "keywords", "explanation"]) assert.equal(raw.includes(`"${secret}"`), false, `leaked ${secret}`)
    assert.equal(p1.data.sections.find((s) => s.questions.some((q) => q.type === "CODING")).questions[0].sampleCases.length, 1)

    // reloading gives back the same order
    const again = await call("POST", "/oa/exam/start", { token: s1.token, body: {} })
    assert.deepEqual(ids(again), ids(p1))
    state.paper1 = p1.data
})

test("answers autosave, bad answers are refused, and the deadline is the server's", opts, async () => {
    const [s1] = state.students
    const mc = state.paper1.sections.flatMap((s) => s.questions).filter((q) => q.type === "MCQ")
    const full = (await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })).data.questions
    const correctOf = (id) => full.find((q) => q.id === id).correct
    const right = mc.slice(0, 8)
    const answers = right.map((q) => ({ questionId: q.id, value: correctOf(q.id) }))
    answers.push({ questionId: mc[8].id, value: [mc[8].options.find((o) => !correctOf(mc[8].id).includes(o.id)).id] })     // one wrong: -0.5
    const saved = await call("PUT", "/oa/exam/answers", { token: s1.token, body: { answers } })
    assert.equal(saved.status, 200)

    assert.equal((await call("PUT", "/oa/exam/answers", { token: s1.token, body: { answers: [{ questionId: mc[0].id, value: ["not-an-option"] }] } })).status, 400)
    assert.equal((await call("PUT", "/oa/exam/answers", { token: s1.token, body: { answers: [{ questionId: "not-in-paper", value: "x" }] } })).status, 400)
    const written = state.paper1.sections.flatMap((s) => s.questions)
    const short = written.find((q) => q.type === "SHORT"); const long = written.find((q) => q.type === "LONG"); const code = written.find((q) => q.type === "CODING")
    assert.equal((await call("PUT", "/oa/exam/answers", { token: s1.token, body: { answers: [
        { questionId: short.id, value: "An index gives fast lookup" }, { questionId: long.id, value: "Normalisation removes redundancy..." }, { questionId: code.id, value: { code: "print(sum(map(int,input().split())))", language: "python" } },
    ] } })).status, 200)
    assert.equal((await call("PUT", "/oa/exam/answers", { token: s1.token, body: { answers: [{ questionId: code.id, value: { code: "x", language: "cobol" } }] } })).status, 400)

    const paper = await call("GET", "/oa/exam/paper", { token: s1.token })
    assert.deepEqual(paper.data.answers[right[0].id], correctOf(right[0].id))       // survives a reload
    assert.ok(new Date(paper.data.deadline) - new Date(paper.data.serverNow) <= 60 * 60e3)
})

test("proctoring: strikes are counted once per act, snapshots stored, and the limit ends the attempt", opts, async () => {
    const [, s2] = state.students
    const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ=="
    const hb = await call("POST", "/oa/exam/heartbeat", { token: s2.token, body: { snapshot: jpeg } })
    assert.equal(hb.data.status, "IN_PROGRESS")
    assert.equal(hb.data.maxViolations, 3)

    assert.equal((await call("POST", "/oa/exam/violation", { token: s2.token, body: { type: "NOT_A_THING" } })).status, 400)
    const first = await call("POST", "/oa/exam/violation", { token: s2.token, body: { type: "TAB_SWITCH", detail: "left the tab", image: jpeg } })
    assert.equal(first.data.violationCount, 1)
    const burst = await call("POST", "/oa/exam/violation", { token: s2.token, body: { type: "TAB_SWITCH" } })     // blur + visibility fire together
    assert.equal(burst.data.violationCount, 1)
    const quiet = await call("POST", "/oa/exam/violation", { token: s2.token, body: { type: "RIGHT_CLICK" } })    // logged, never counted
    assert.equal(quiet.data.violationCount, 1)
    const noModel = await call("POST", "/oa/exam/violation", { token: s2.token, body: { type: "FACE_CHECK_UNAVAILABLE", detail: "model could not load" } })   // recorded for the organizer, never a strike
    assert.equal(noModel.data.violationCount, 1)
    assert.equal((await call("POST", "/oa/exam/violation", { token: s2.token, body: { type: "NO_FACE" } })).data.violationCount, 2)
    const last = await call("POST", "/oa/exam/violation", { token: s2.token, body: { type: "FULLSCREEN_EXIT" } })
    assert.equal(last.data.violationCount, 3)
    assert.equal(last.data.status, "TERMINATED")
    assert.match(last.data.endReason, /3 proctoring violations/)
    assert.equal((await call("PUT", "/oa/exam/answers", { token: s2.token, body: { answers: [] } })).status, 409)
    assert.equal((await call("POST", "/oa/exam/start", { token: s2.token, body: {} })).error.code, "ALREADY_FINISHED")
})

test("submit once; time-up is enforced by the server even if the browser is gone", opts, async () => {
    const [s1, , s3, s4] = state.students
    const sub = await call("POST", "/oa/exam/submit", { token: s1.token })
    assert.equal(sub.data.status, "SUBMITTED")
    assert.equal((await call("POST", "/oa/exam/submit", { token: s1.token })).data.status, "SUBMITTED")     // idempotent
    assert.equal((await call("PUT", "/oa/exam/answers", { token: s1.token, body: { answers: [] } })).status, 409)

    await call("POST", "/oa/exam/start", { token: s3.token, body: { environment: { latitude: 12.9716, longitude: 77.5946 } } })
    await models.OaAttempt.updateOne({ studentId: s3.id }, { deadline: new Date(Date.now() - 60e3) })
    assert.ok(await exam.finalizeExpiredAttempts() >= 1)
    const gone = await call("GET", "/oa/exam/session", { token: s3.token })
    assert.equal(gone.data.attempt.status, "AUTO_SUBMITTED")
    assert.equal(gone.data.canStart, false)

    // a student who never opened the test has no attempt
    assert.equal((await call("GET", "/oa/exam/session", { token: s4.token })).data.attempt, null)
})

test("results: auto marks, pending manual grading, rank, filters and a filtered export", opts, async () => {
    const results = await call("GET", `/oa/assessments/${state.a}/results?pageSize=100`, { token: state.admin })
    const row = (name) => results.data.find((r) => r.name === name)
    const s1 = row("Student A")
    // 8 right x2 = 16, one wrong -0.5, short answer hits 1 of 2 keywords = 2  => 17.5 so far; long + code wait for the admin
    assert.equal(s1.score, 17.5)
    assert.equal(s1.gradingStatus, "PENDING_REVIEW")
    assert.equal(s1.rank, 1)
    assert.equal(row("Student B").status, "TERMINATED")
    assert.equal(row("Student B").rank, null)
    assert.equal(row("Student D").status, "NOT_STARTED")
    assert.equal(results.json.meta.summary.pendingReview, 1)

    const detail = await call("GET", `/oa/assessments/${state.a}/attempts/${s1.attemptId}`, { token: state.admin })
    const long = detail.data.sections.flatMap((s) => s.questions).find((q) => q.type === "LONG")
    const code = detail.data.sections.flatMap((s) => s.questions).find((q) => q.type === "CODING")
    assert.equal(long.grade.marks, null)
    assert.equal((await call("PUT", `/oa/assessments/${state.a}/attempts/${s1.attemptId}/grades`, { token: state.admin, body: { grades: [{ questionId: long.id, marks: 99 }] } })).status, 400)
    const graded = await call("PUT", `/oa/assessments/${state.a}/attempts/${s1.attemptId}/grades`, { token: state.admin, body: { grades: [{ questionId: long.id, marks: 8, feedback: "Good" }, { questionId: code.id, marks: 20 }] } })
    assert.equal(graded.data.gradingStatus, "COMPLETE")
    assert.equal(graded.data.score, 45.5)

    const student2 = await call("GET", `/oa/assessments/${state.a}/attempts/${row("Student B").attemptId}`, { token: state.admin })
    assert.equal(student2.data.violations.filter((v) => v.counted).length, 3)
    assert.equal(student2.data.snapshots.length, 1)
    assert.ok(student2.data.violations.find((v) => v.type === "TAB_SWITCH").image)

    // filters work server-side and the export honours them
    const passed = await call("GET", `/oa/assessments/${state.a}/results?result=PASSED`, { token: state.admin })
    assert.deepEqual(passed.data.map((r) => r.name), ["Student A"])
    const flagged = await call("GET", `/oa/assessments/${state.a}/results?flagged=true`, { token: state.admin })
    assert.deepEqual(flagged.data.map((r) => r.name), ["Student B"])
    const csv = await call("GET", `/oa/assessments/${state.a}/results/export?flagged=true`, { token: state.admin })
    assert.match(csv.json, /Student B/)
    assert.doesNotMatch(csv.json, /Student A/)

    // the admin's decision changes who is ranked
    await call("PUT", `/oa/assessments/${state.a}/attempts/${row("Student B").attemptId}/decision`, { token: state.admin, body: { decision: "CLEARED" } })
    const after = await call("GET", `/oa/assessments/${state.a}/results?pageSize=100`, { token: state.admin })
    assert.equal(after.data.find((r) => r.name === "Student B").rank !== null, true)
})

test("the student sees their score only when the organizer allows it", opts, async () => {
    const [s1] = state.students
    const sess = await call("GET", "/oa/exam/session", { token: s1.token })
    assert.equal(sess.data.result.percent, Math.round((45.5 / 58) * 10000) / 100)
    assert.equal(sess.data.result.passed, true)
})

test("questions and rules are locked once anyone has started", opts, async () => {
    const q = (await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })).data.questions[0]
    assert.equal((await call("DELETE", `/oa/assessments/${state.a}/questions/${q.id}`, { token: state.admin })).error.code, "TEST_STARTED")
    assert.equal((await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { settings: { passPercent: 1 } } })).error.code, "TEST_STARTED")
    assert.equal((await call("POST", `/oa/assessments/${state.a}/unpublish`, { token: state.admin })).error.code, "TEST_STARTED")
    assert.equal((await call("DELETE", `/oa/assessments/${state.a}/students/${state.students[0].id}`, { token: state.admin })).error.code, "TEST_STARTED")
})

test("next round carries over only the qualifiers, with fresh codes", opts, async () => {
    const none = await call("POST", `/oa/assessments/${state.a}/next-round`, { token: state.admin, body: { minPercent: 100 } })
    assert.equal(none.error.code, "NO_ONE_QUALIFIES")
    const next = await call("POST", `/oa/assessments/${state.a}/next-round`, { token: state.admin, body: { title: "Round 2", topN: 1 } })
    assert.equal(next.data.students, 1)
    const list = await call("GET", `/oa/assessments/${next.data.assessmentId}/students`, { token: state.admin })
    assert.equal(list.data[0].email, "s1@college.test")
    assert.notEqual(list.data[0].accessCode, state.students[0].accessCode)
})

test("one organizer can never reach another's tests by changing the id", opts, async () => {
    await call("POST", "/oa/auth/register", { body: { orgName: "Rival", contactName: "Rick", email: "rick@rival.test", password: "Sup3rSecret" } })
    const acc = (await call("GET", "/oa/platform/accounts?search=rival", { token: state.checker })).data[0]
    await call("POST", `/oa/platform/accounts/${acc.id}/approve`, { token: state.checker })
    const rival = (await call("POST", "/oa/auth/login", { body: { email: "rick@rival.test", password: "Sup3rSecret" } })).data.token
    for (const [method, url] of [["GET", ""], ["GET", "/students"], ["GET", "/results"], ["GET", "/live"], ["GET", "/results/export"]]) {
        assert.equal((await call(method, `/oa/assessments/${state.a}${url}`, { token: rival })).status, 404, url)
    }
    assert.equal((await call("PATCH", `/oa/assessments/${state.a}`, { token: rival, body: { title: "hijacked" } })).status, 404)
    assert.equal((await call("GET", "/oa/assessments", { token: rival })).data.length, 0)
    assert.equal((await call("GET", "/oa/assessments/not-an-id", { token: rival })).status, 404)
})

test("a suspended organizer is shut out at once, even with a valid token", opts, async () => {
    assert.equal((await call("GET", "/oa/me", { token: state.admin })).status, 200)
    await call("POST", `/oa/platform/accounts/${state.accountId}/suspend`, { token: state.checker })
    await new Promise((r) => setTimeout(r, 16000))        // the activity cache lives 15s
    assert.equal((await call("GET", "/oa/me", { token: state.admin })).status, 403)
    assert.equal((await call("POST", "/oa/auth/login", { body: { email: "owner@acme.test", password: "Sup3rSecret" } })).error.code, "ACCOUNT_SUSPENDED")
})
