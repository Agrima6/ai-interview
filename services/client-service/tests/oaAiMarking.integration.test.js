import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import net from "node:net"
import http from "node:http"

// Drives the real Express app over HTTP against a throwaway local mongod. Skipped when mongod is not installed,
// so `npm test` still passes on machines (and CI images) without it.
const hasMongod = spawnSync("mongod", ["--version"]).status === 0
const opts = { skip: hasMongod ? false : "mongod is not installed" }

let mongo, dbPath, server, base, mongoose, models, exam, fake
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)) }) })

before(async () => {
    if (!hasMongod) return
    dbPath = mkdtempSync(path.join(tmpdir(), "oa-test-"))
    // Another test file may grab the port between "find a free one" and "listen on it": if mongod dies at once, pick again.
    let port
    for (let attempt = 0; attempt < 6; attempt++) {
        port = await freePort()
        mongo = spawn("mongod", ["--dbpath", dbPath, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket"], { stdio: "ignore" })
        let exited = false
        mongo.on("exit", () => { exited = true })
        await new Promise((r) => setTimeout(r, 500))
        if (!exited) break
    }
    process.env.MONGODB_URL = `mongodb://127.0.0.1:${port}/oa_test`
    process.env.ACCESS_TOKEN_SECRET = "test-secret"
    process.env.SERVICE_NAME = "client-service-test"
    process.env.COMMUNICATION_SERVICE_URL = "http://127.0.0.1:9"
    process.env.COMMUNICATION_SERVICE_API_KEY = "x"
    // A stand-in for the AI provider: marks 3.7 for anything, 0 for an answer that says "EMPTY".
    fake = http.createServer((req, res) => {
        let body = ""
        req.on("data", (c) => { body += c })
        req.on("end", () => {
            const j = JSON.parse(body || "{}")
            const user = String(j.messages?.[1]?.content || "")
            const payload = user.includes("EMPTYANSWER") ? { marks: 0, feedback: "Nothing relevant." } : user.includes("HUGE") ? { marks: 99, feedback: "x".repeat(900) } : { marks: 3.7, feedback: "Covers the main idea but misses detail." }
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }))
        })
    })
    await new Promise((resolve) => fake.listen(0, "127.0.0.1", resolve))
    process.env.OA_AI_API_KEY = "test-key"
    process.env.OA_AI_BASE_URL = `http://127.0.0.1:${fake.address().port}`
    process.env.OA_AI_MODEL = "test-model"
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
    fake?.close()
    await mongoose?.disconnect()
    if (mongo) {
        const closed = new Promise((resolve) => { if (mongo.exitCode !== null) resolve(); else mongo.once("exit", resolve) })
        mongo.kill()
        await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 5000))])
    }
    // Leftover temp files are not a test failure.
    try { if (dbPath) rmSync(dbPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* ignore */ }
})

const call = async (method, url, { token, body } = {}) => {
    const res = await fetch(`${base}${url}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const type = res.headers.get("content-type") || ""
    const json = type.includes("json") ? await res.json() : await res.text()
    return { status: res.status, json, data: json?.data, error: json?.error }
}
const state = {}
const future = (ms) => new Date(Date.now() + ms).toISOString()
const waitFor = async (fn) => { let v; for (let i = 0; i < 60 && !(v = await fn()); i++) await new Promise((r) => setTimeout(r, 150)); return v }

const sitTest = async (answers) => {
    const email = `c${Math.random().toString(36).slice(2, 8)}@ai.test`
    await call("POST", `/oa/assessments/${state.a}/students`, { token: state.admin, body: { students: [{ name: "Asha Verma", email }] } })
    const s = (await call("GET", `/oa/assessments/${state.a}/students?search=${email}`, { token: state.admin })).data[0]
    const token = (await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email, code: s.accessCode } })).data.token
    const paper = await call("POST", "/oa/exam/start", { token, body: { environment: { userAgent: "t" } } })
    const byText = Object.fromEntries(paper.data.sections.flatMap((x) => x.questions).map((q) => [q.text.slice(0, 5), q.id]))
    await call("PUT", "/oa/exam/answers", { token, body: { answers: Object.entries(answers).map(([t, value]) => ({ questionId: byText[t], value })) } })
    await call("POST", "/oa/exam/submit", { token })
    return { email, byText }
}
const rowOf = async (email) => (await call("GET", `/oa/assessments/${state.a}/results`, { token: state.admin })).data.find((r) => r.email === email)

test("set up: a round with a short answer, a long answer and a multiple-choice question", opts, async () => {
    const reg = await call("POST", "/oa/auth/register", { body: { orgName: "Mark College", contactName: "Ana Owner", email: "owner@mark.test", password: "Sup3rSecret" } })
    await models.OaAccount.updateOne({ _id: reg.data.id }, { $set: { status: "ACTIVE" } })
    state.admin = (await call("POST", "/oa/auth/login", { body: { email: "owner@mark.test", password: "Sup3rSecret" } })).data.token
    const created = await call("POST", "/oa/assessments", { token: state.admin, body: { title: "AI Marking" } })
    state.a = created.data.id
    assert.equal(created.data.settings.aiMarking, true)            // new rounds have it on
    await call("POST", `/oa/assessments/${state.a}/questions`, { token: state.admin, body: { questions: [
        { type: "SHORT", text: "Short: explain polymorphism.", marks: 5 },
        { type: "LONG", text: "Large: discuss design patterns.", marks: 4 },
        { type: "MCQ", text: "Pick: which is right?", marks: 1, options: ["a", "b"], correct: "a" },
    ] } })
    const set = await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: {
        schedule: { mode: "FLEXIBLE", startAt: future(-60000), endAt: future(7 * 24 * 3600 * 1000), durationMinutes: 30, timezone: "Asia/Kolkata" },
        proctoring: { level: "STANDARD", requireCamera: false, requireScreenShare: false, requireFullscreen: false, faceChecks: false, blockCopyPaste: false, requireLocation: false, maxViolations: 5, snapshotIntervalSec: 45 },
    } })
    assert.equal(set.status, 200)
    assert.equal((await call("POST", `/oa/assessments/${state.a}/publish`, { token: state.admin })).status, 200)
})

test("AI suggests marks for written answers after submit: half marks, capped at the maximum, with a short reason", opts, async () => {
    const { email } = await sitTest({ "Short": "Many forms of one interface.", "Large": "HUGE answer about patterns" })
    const row = await waitFor(async () => { const r = await rowOf(email); return r?.score >= 7.5 ? r : null })
    assert.ok(row, "AI marks were never applied")
    assert.equal(row.score, 7.5)           // short: 3.7 becomes 3.5; long: 99 is capped at its 4 marks
    state.row = row
    const detail = await call("GET", `/oa/assessments/${state.a}/attempts/${row.attemptId}`, { token: state.admin })
    assert.equal(detail.status, 200)
    const grades = Object.values(detail.data.sections.flatMap((x) => x.questions).reduce((o, q) => ({ ...o, [q.text.slice(0, 5)]: q.grade }), {}))
    const ai = grades.filter((g) => g?.ai)
    assert.equal(ai.length, 2)
    assert.ok(ai.every((g) => g.needsReview === true && g.ai.feedback.length > 0 && g.ai.feedback.length <= 400))   // the reason is kept short
})

test("the organizer can change an AI mark, and a later pass never overwrites it", opts, async () => {
    const detail = await call("GET", `/oa/assessments/${state.a}/attempts/${state.row.attemptId}`, { token: state.admin })
    const short = detail.data.sections.flatMap((x) => x.questions).find((q) => q.text.startsWith("Short"))
    const saved = await call("PUT", `/oa/assessments/${state.a}/attempts/${state.row.attemptId}/grades`, { token: state.admin, body: { grades: [{ questionId: short.id, marks: 5 }] } })
    assert.equal(saved.status, 200)
    assert.equal((await rowOf(state.row.email)).score, 9)             // 5 by hand + 4 from AI
    const { aiMarkAnswers } = await import("../services/oaExam.service.js")
    await aiMarkAnswers(state.row.attemptId)                           // run the AI pass again
    assert.equal((await rowOf(state.row.email)).score, 9)             // the hand-set mark is kept
})

test("an empty answer is left alone, and switching AI marking off stops it", opts, async () => {
    const empty = await sitTest({ "Short": "   " })
    await new Promise((r) => setTimeout(r, 800))
    assert.equal((await rowOf(empty.email)).score, 0)

    assert.equal((await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { settings: { aiMarking: false } } })).status, 409)   // locked once someone has started
    const other = (await call("POST", "/oa/assessments", { token: state.admin, body: { title: "No AI", settings: { aiMarking: false } } })).data
    assert.equal(other.settings.aiMarking, false)
})
