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
    // A stand-in for the code runner: doubles the number it is given, unless the program says otherwise.
    fake = http.createServer((req, res) => {
        let body = ""
        req.on("data", (c) => { body += c })
        req.on("end", () => {
            const j = JSON.parse(body || "{}")
            const code = Buffer.from(j.source_code || "", "base64").toString()
            const stdin = Buffer.from(j.stdin || "", "base64").toString()
            const enc = (t) => Buffer.from(t).toString("base64")
            const reply = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)) }
            if (code.includes("SYNTAX")) return reply({ status: { id: 6, description: "Compilation Error" }, compile_output: enc("error: expected ';'"), stdout: null, stderr: null, time: null })
            if (code.includes("CRASH")) return reply({ status: { id: 11, description: "Runtime Error (NZEC)" }, stdout: null, stderr: enc("boom"), time: "0.01" })
            const n = Number(stdin.trim())
            const out = code.includes("WRONG") ? "0" : code.includes("ODD") && n >= 5 ? "0" : String(n * 2)
            reply({ status: { id: 3, description: "Accepted" }, stdout: enc(`${out}  \n\n`), stderr: null, time: "0.02" })
        })
    })
    await new Promise((resolve) => fake.listen(0, "127.0.0.1", resolve))
    process.env.OA_CODE_RUNNER_URL = `http://127.0.0.1:${fake.address().port}`
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
    mongo?.kill()
    if (dbPath) rmSync(dbPath, { recursive: true, force: true })
})

const call = async (method, url, { token, body } = {}) => {
    const res = await fetch(`${base}${url}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const type = res.headers.get("content-type") || ""
    const json = type.includes("json") ? await res.json() : await res.text()
    return { status: res.status, json, data: json?.data, error: json?.error }
}
const state = {}
const future = (ms) => new Date(Date.now() + ms).toISOString()
const CASES = [{ input: "2", expected: "4", hidden: false }, { input: "5", expected: "10", hidden: true }]

test("set up: a published test with a coding question that has one sample and one hidden test case", opts, async () => {
    const reg = await call("POST", "/oa/auth/register", { body: { orgName: "Run College", contactName: "Ana Owner", email: "owner@run.test", password: "Sup3rSecret" } })
    await models.OaAccount.updateOne({ _id: reg.data.id }, { $set: { status: "ACTIVE" } })
    state.admin = (await call("POST", "/oa/auth/login", { body: { email: "owner@run.test", password: "Sup3rSecret" } })).data.token
    state.a = (await call("POST", "/oa/assessments", { token: state.admin, body: { title: "Double It" } })).data.id
    const q = await call("POST", `/oa/assessments/${state.a}/questions`, { token: state.admin, body: { questions: [
        { type: "CODING", text: "Read a number and print its double.", marks: 10, codeLanguages: ["python", "java", "sql"], testCases: CASES },
        { type: "CODING", text: "No tests here.", marks: 5, codeLanguages: ["python"] },
    ] } })
    assert.equal(q.data.added, 2)
    const set = await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: {
        schedule: { mode: "FLEXIBLE", startAt: future(-60000), endAt: future(7 * 24 * 3600 * 1000), durationMinutes: 30, timezone: "Asia/Kolkata" },
        proctoring: { level: "STANDARD", requireCamera: false, requireScreenShare: false, requireFullscreen: false, faceChecks: false, blockCopyPaste: false, requireLocation: false, maxViolations: 5, snapshotIntervalSec: 45 },
    } })
    assert.equal(set.status, 200)
    assert.equal((await call("POST", `/oa/assessments/${state.a}/publish`, { token: state.admin })).status, 200)
    await call("POST", `/oa/assessments/${state.a}/students`, { token: state.admin, body: { students: [{ name: "Asha Verma", email: "asha@run.test" }] } })
    const list = (await call("GET", `/oa/assessments/${state.a}/students`, { token: state.admin })).data[0]
    const login = await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email: "asha@run.test", code: list.accessCode } })
    state.student = login.data.token
    const paper = await call("POST", "/oa/exam/start", { token: state.student, body: { environment: { userAgent: "test" } } })
    assert.equal(paper.status, 200)
    assert.ok(paper.data.runnableLanguages.includes("python"))
    assert.equal(paper.data.runnableLanguages.includes("html"), false)
    state.coding = paper.data.sections.flatMap((s) => s.questions)
    state.withTests = state.coding.find((x) => x.text.startsWith("Read a number")).id
    state.noTests = state.coding.find((x) => x.text.startsWith("No tests")).id
})

test("Run shows the sample cases only: input, expected, output and pass or fail, never the hidden case", opts, async () => {
    const ok = await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "python", code: "print(int(input())*2)" } })
    assert.equal(ok.status, 200)
    assert.equal(ok.data.total, 1)
    assert.equal(ok.data.passed, 1)
    assert.deepEqual({ input: ok.data.results[0].input, expected: ok.data.results[0].expected, passed: ok.data.results[0].passed }, { input: "2", expected: "4", passed: true })   // "4  \n\n" equals "4"
    assert.equal(JSON.stringify(ok.data).includes('"10"'), false)

    const wrong = await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "python", code: "WRONG" } })
    assert.equal(wrong.data.passed, 0)
    assert.equal(wrong.data.results[0].verdict, "WRONG_ANSWER")
    assert.equal(wrong.data.results[0].output.trim(), "0")

    const syntax = await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "python", code: "SYNTAX" } })
    assert.equal(syntax.data.results[0].verdict, "COMPILE_ERROR")
    assert.match(syntax.data.results[0].error, /expected/)
    const crash = await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "python", code: "CRASH" } })
    assert.equal(crash.data.results[0].verdict, "RUNTIME_ERROR")
})

test("custom input runs the program on that input; bad requests are refused", opts, async () => {
    const custom = await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "python", code: "x", customInput: "21" } })
    assert.equal(custom.data.custom, true)
    assert.equal(custom.data.results[0].output.trim(), "42")
    assert.equal(custom.data.results[0].passed, null)

    assert.equal((await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "java", code: "x", customInput: "1" } })).status, 200)
    assert.equal((await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "sql", code: "select 1", customInput: "" } })).status, 200)   // SQLite is runnable
    assert.equal((await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "cobol", code: "x" } })).status, 400)       // not allowed for this question
    assert.equal((await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.noTests, language: "python", code: "x" } })).error.code, "NO_SAMPLE_CASES")
    assert.equal((await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: "nope", language: "python", code: "x" } })).status, 400)
    assert.equal((await call("POST", "/oa/exam/run", { body: { questionId: state.withTests, language: "python", code: "x" } })).status, 401)
    assert.equal((await call("POST", "/oa/exam/run", { token: state.admin, body: { questionId: state.withTests, language: "python", code: "x" } })).status, 403)   // an organizer is not a candidate
    assert.equal((await call("POST", "/oa/exam/run", { token: state.student, body: { questionId: state.withTests, language: "python", code: "x".repeat(50001) } })).status, 400)
})

test("on submit every case, hidden included, is run and the answer is scored by the share that passed", opts, async () => {
    // passes the sample (input 2) but fails the hidden case (input 5): half the marks
    const saved = await call("PUT", "/oa/exam/answers", { token: state.student, body: { answers: [{ questionId: state.withTests, value: { code: "ODD", language: "python" } }] } })
    assert.equal(saved.status, 200)
    assert.equal((await call("POST", "/oa/exam/submit", { token: state.student })).status, 200)
    let row
    for (let i = 0; i < 40 && !(row?.score > 0); i++) {
        await new Promise((r) => setTimeout(r, 150))
        row = (await call("GET", `/oa/assessments/${state.a}/results`, { token: state.admin })).data[0]
    }
    assert.equal(row.score, 5)                // 10 marks x 1 of 2 cases
    // the organizer can see how the score came about, and the unrun starter code earns nothing
    const rows = (await call("GET", `/oa/assessments/${state.a}/results`, { token: state.admin })).data
    assert.equal(rows[0].percent, 33.33)       // 5 of 15 marks: the second question has no test cases and stays unmarked
})
