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
    dbPath = mkdtempSync(path.join(tmpdir(), "mark-test-"))
    let port
    for (let attempt = 0; attempt < 6; attempt++) {
        port = await freePort()
        mongo = spawn("mongod", ["--dbpath", dbPath, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket"], { stdio: "ignore" })
        let exited = false
        mongo.on("exit", () => { exited = true })
        await new Promise((r) => setTimeout(r, 500))
        if (!exited) break
    }
    process.env.MONGODB_URL = `mongodb://127.0.0.1:${port}/mark_test`
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

const state = {}
const oid = () => new mongoose.Types.ObjectId()

test("set up: a fake AI provider, a test whose old AI-marking switch is OFF, and a submitted attempt with an unmarked written answer", opts, async () => {
    const { createServer } = await import("node:http")
    state.mode = "ok"; state.calls = 0
    state.ai = createServer((req, res) => {
        state.calls += 1
        if (state.mode === "down") { res.writeHead(503, { "content-type": "application/json" }); return res.end("{}") }
        res.writeHead(200, { "content-type": "application/json" })
        res.end(JSON.stringify({ choices: [{ message: { content: '{"marks": 7, "feedback": "Covers the main point, misses an example."}' } }], model: "fake-model" }))
    })
    await new Promise((resolve) => state.ai.listen(0, "127.0.0.1", resolve))
    process.env.OA_AI_API_KEY = "sk-test-key"; process.env.OA_AI_BASE_URL = `http://127.0.0.1:${state.ai.address().port}/v1`; process.env.OA_AI_MODEL = "fake-model"
    delete process.env.OA_AI_FALLBACK_API_KEY

    const { OaAccount, OaAssessment, OaAttempt, OaStudent } = await import("../models/oa.model.js")
    const acc = await OaAccount.create({ orgName: "Mark Org", contactName: "O", email: "oa@mark.test", emailNormalized: "oa@mark.test", passwordHash: "x", status: "ACTIVE" })
    const test = await OaAssessment.create({
        accountId: acc._id, title: "Marking test", status: "PUBLISHED", sections: [{ id: "s1", title: "" }], settings: { aiMarking: false, passPercent: 40 },
        questions: [{ id: "m1", sectionId: "s1", type: "MCQ", text: "Pick", options: [{ id: "a", text: "a" }, { id: "b", text: "b" }], correct: ["a"], marks: 2 }, { id: "w1", sectionId: "s1", type: "SHORT", text: "Explain polymorphism", marks: 10 }],
    })
    state.attempt = async (n, status = "SUBMITTED") => {
        const student = await OaStudent.create({ accountId: acc._id, assessmentId: test._id, name: `S${n}`, email: `s${n}@m.test`, emailNormalized: `s${n}@m.test`, codeHash: "h", codeEncrypted: "e" })
        const a = await OaAttempt.create({ accountId: acc._id, assessmentId: test._id, studentId: student._id, status, startedAt: new Date(Date.now() - 3600000), submittedAt: new Date(Date.now() - 1800000), deadline: new Date(), order: {}, answers: { m1: { value: ["a"] }, w1: { value: "Many forms of the same call, resolved at runtime." } }, grades: { m1: { marks: 2, auto: true, needsReview: false }, w1: { marks: null, auto: false, needsReview: true } }, score: 2, maxScore: 12, percent: 16.67, gradingStatus: "PENDING_REVIEW" })
        return a._id
    }
    state.models = { OaAttempt }
})

test("written answers are marked by AI on their own, even though the old switch is off, and the score updates", opts, async () => {
    const { sweepPendingMarking } = await import("../services/oaExam.service.js")
    const id = await state.attempt(1)
    const run = await sweepPendingMarking()
    assert.equal(run.tried, 1); assert.equal(run.marked, 1)
    const a = await state.models.OaAttempt.findById(id).lean()
    assert.equal(a.grades.w1.marks, 7); assert.equal(a.grades.w1.ai.model, "fake-model"); assert.match(a.grades.w1.ai.feedback, /main point/)
    assert.equal(a.score, 9); assert.equal(a.percent, 75); assert.equal(a.gradingStatus, "COMPLETE")        // nobody had to mark anything
    assert.equal(a.grades.m1.marks, 2)                                                                       // the multiple-choice mark is untouched
    const again = await sweepPendingMarking()
    assert.equal(again.tried, 0)                                                                             // done: not marked a second time
    assert.equal(state.calls, 1)
})

test("a marking by hand is never overwritten by the AI", opts, async () => {
    const { sweepPendingMarking } = await import("../services/oaExam.service.js")
    const id = await state.attempt(2)
    await state.models.OaAttempt.updateOne({ _id: id }, { $set: { "grades.w1": { marks: 4, auto: false, needsReview: false, gradedAt: new Date() }, gradingStatus: "PENDING_REVIEW" } })
    const before = state.calls
    await sweepPendingMarking()
    const a = await state.models.OaAttempt.findById(id).lean()
    assert.equal(a.grades.w1.marks, 4); assert.equal(state.calls, before)
})

test("when the AI is down it is retried a few times, then left alone; and it recovers when the AI is back", opts, async () => {
    const { sweepPendingMarking } = await import("../services/oaExam.service.js")
    state.mode = "down"
    const id = await state.attempt(3)
    for (let i = 1; i <= 6; i++) {
        await state.models.OaAttempt.updateOne({ _id: id }, { $set: { aiMarkTriedAt: new Date(Date.now() - 3600000) } })      // ten minutes have passed
        const run = await sweepPendingMarking()
        assert.equal(run.tried, 1, `try ${i}`); assert.equal(run.marked, 0)
    }
    let a = await state.models.OaAttempt.findById(id).lean()
    assert.equal(a.gradingStatus, "PENDING_REVIEW"); assert.equal(a.aiMarkTries, 6)
    await state.models.OaAttempt.updateOne({ _id: id }, { $set: { aiMarkTriedAt: new Date(Date.now() - 3600000) } })
    assert.equal((await sweepPendingMarking()).tried, 0)                                                                    // gave up: no endless retrying
    // a person (or an operator) can reset it once the AI is healthy again
    state.mode = "ok"
    await state.models.OaAttempt.updateOne({ _id: id }, { $set: { aiMarkTries: 0, aiMarkTriedAt: null } })
    assert.equal((await sweepPendingMarking()).marked, 1)
    a = await state.models.OaAttempt.findById(id).lean()
    assert.equal(a.gradingStatus, "COMPLETE"); assert.equal(a.grades.w1.marks, 7)
    state.ai.close()
})

test("a recently tried attempt waits before it is tried again", opts, async () => {
    const { sweepPendingMarking } = await import("../services/oaExam.service.js")
    state.mode = "down"
    state.ai = (await import("node:http")).createServer((req, res) => { res.writeHead(503); res.end("{}") })
    await new Promise((resolve) => state.ai.listen(0, "127.0.0.1", resolve))
    process.env.OA_AI_BASE_URL = `http://127.0.0.1:${state.ai.address().port}/v1`
    await state.attempt(4)
    assert.equal((await sweepPendingMarking()).tried, 1)
    assert.equal((await sweepPendingMarking()).tried, 0)                         // tried a moment ago: not again for ten minutes
    state.ai.close()
})
