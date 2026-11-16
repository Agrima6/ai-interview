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

test("set up an approved organizer with a test that has a question and a schedule", opts, async () => {
    const reg = await call("POST", "/oa/auth/register", { body: { orgName: "Join College", contactName: "Ana Owner", email: "owner@join.test", password: "Sup3rSecret" } })
    assert.equal(reg.status, 200)
    await models.OaAccount.updateOne({ _id: reg.data.id }, { $set: { status: "ACTIVE" } })
    state.admin = (await call("POST", "/oa/auth/login", { body: { email: "owner@join.test", password: "Sup3rSecret" } })).data.token
    const created = await call("POST", "/oa/assessments", { token: state.admin, body: { title: "Open Registration Test" } })
    state.a = created.data.id
    const q = await call("POST", `/oa/assessments/${state.a}/questions`, { token: state.admin, body: { questions: [{ type: "MCQ", text: "Pick a", options: ["a", "b"], correct: "a", marks: 1 }] } })
    assert.equal(q.data.added, 1)
    const sched = await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { schedule: { mode: "FLEXIBLE", startAt: future(60000), endAt: future(7 * 24 * 3600 * 1000), durationMinutes: 30, timezone: "Asia/Kolkata" } } })
    assert.equal(sched.status, 200)
})

test("registration is off by default, and a made-up link is a plain 404", opts, async () => {
    assert.equal((await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })).data.registration.enabled, false)
    assert.equal((await call("GET", "/oa/join/not-a-real-token-123456")).status, 404)
    assert.equal((await call("POST", "/oa/join/not-a-real-token-123456", { body: { name: "Asha Verma", email: "asha@x.test" } })).status, 404)
})

test("the organizer switches registration on and gets a link; only the owner can", opts, async () => {
    const on = await call("PUT", `/oa/assessments/${state.a}/registration`, { token: state.admin, body: { enabled: true } })
    assert.equal(on.status, 200)
    assert.equal(on.data.registration.enabled, true)
    state.token = on.data.registration.token
    assert.match(state.token, /^[A-Za-z0-9_-]{16,40}$/)
    assert.equal((await call("PUT", `/oa/assessments/${state.a}/registration`, { body: { enabled: false } })).status, 401)   // no login
    const bad = await call("PUT", `/oa/assessments/${state.a}/registration`, { token: state.admin, body: { maxRegistrations: -3 } })
    assert.equal(bad.status, 400)
    const info = await call("GET", `/oa/join/${state.token}`)
    assert.equal(info.status, 200)
    assert.equal(info.data.open, true)
    assert.equal(info.data.title, "Open Registration Test")
    assert.equal(info.data.brand.name, "Join College")
    assert.equal(info.data.registration, undefined)      // nothing about the link's settings or the people on it
})

test("a candidate registers: they wait, cannot sign in, and are not counted until approved", opts, async () => {
    const bad = await call("POST", `/oa/join/${state.token}`, { body: { name: "A", email: "nope" } })
    assert.equal(bad.status, 400)
    assert.equal((await call("POST", `/oa/join/${state.token}`, { body: { name: "Asha Verma", email: "asha@x.test", phone: "12345678901" } })).status, 400)   // eleven digits

    const ok = await call("POST", `/oa/join/${state.token}`, { body: { name: "Asha Verma", email: "Asha@X.test", phone: "9876543210" } })
    assert.equal(ok.status, 200)
    assert.equal(ok.data.received, true)
    // registering again, or with the same address in other letters, looks identical and adds nobody
    assert.equal((await call("POST", `/oa/join/${state.token}`, { body: { name: "Asha Again", email: "asha@x.test" } })).data.received, true)
    // a bot that fills the hidden field is told it worked, and nothing is stored
    assert.equal((await call("POST", `/oa/join/${state.token}`, { body: { name: "Spam Bot", email: "bot@x.test", website: "http://spam" } })).data.received, true)

    assert.equal(await models.OaStudent.countDocuments({ assessmentId: state.a }), 1)
    const main = await call("GET", `/oa/assessments/${state.a}/students`, { token: state.admin })
    assert.equal(main.data.length, 0)                                    // the main list shows approved people only
    const waiting = await call("GET", `/oa/assessments/${state.a}/students?approval=PENDING`, { token: state.admin })
    assert.equal(waiting.data.length, 1)
    assert.equal(waiting.data[0].approval.status, "PENDING")
    assert.equal(waiting.data[0].approval.source, "SELF")
    state.asha = waiting.data[0]
    const stats = (await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })).data.stats
    assert.equal(stats.pending, 1)
    assert.equal(stats.students, 0)
    assert.equal((await call("GET", "/oa/dashboard", { token: state.admin })).data.pending.total, 1)
    // waiting people are not candidates yet: not in the drive count, results or the live view
    assert.equal((await call("GET", `/oa/assessments/${state.a}/results`, { token: state.admin })).data.length, 0)
    assert.equal((await call("GET", `/oa/assessments/${state.a}/live`, { token: state.admin })).data.items.length, 0)
    const drives = await call("GET", "/oa/drives", { token: state.admin })
    assert.equal(drives.data.every((d) => d.candidates === 0), true)
})

test("someone waiting for approval cannot sign in, even holding their code, and is never emailed", opts, async () => {
    assert.equal((await call("POST", `/oa/assessments/${state.a}/publish`, { token: state.admin })).status, 200)
    const login = await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email: "asha@x.test", code: state.asha.accessCode } })
    assert.equal(login.status, 401)
    const invite = await call("POST", `/oa/assessments/${state.a}/students/invite`, { token: state.admin, body: {} })
    assert.equal(invite.data.attempted, 0)
})

test("approving needs real selections, only works on this round's people, and then lets them in", opts, async () => {
    assert.equal((await call("POST", `/oa/assessments/${state.a}/students/decide`, { token: state.admin, body: { decision: "APPROVE", studentIds: [] } })).status, 400)
    assert.equal((await call("POST", `/oa/assessments/${state.a}/students/decide`, { token: state.admin, body: { decision: "MAYBE", studentIds: [state.asha.id] } })).status, 400)
    assert.equal((await call("POST", `/oa/assessments/${state.a}/students/decide`, { body: { decision: "APPROVE", studentIds: [state.asha.id] } })).status, 401)
    assert.equal((await call("POST", `/oa/assessments/${state.a}/students/decide`, { token: state.admin, body: { decision: "APPROVE", studentIds: ["507f1f77bcf86cd799439099"] } })).status, 409)

    const approved = await call("POST", `/oa/assessments/${state.a}/students/decide`, { token: state.admin, body: { decision: "APPROVE", studentIds: [state.asha.id] } })
    assert.equal(approved.status, 200)
    assert.equal(approved.data.decided, 1)
    assert.equal(approved.data.invited.attempted, 1)        // published, so the invitation went out at once (the mail service is not running in tests, so it is reported as failed)
    assert.equal((await call("POST", `/oa/assessments/${state.a}/students/decide`, { token: state.admin, body: { decision: "APPROVE", studentIds: [state.asha.id] } })).status, 409)   // already decided

    const login = await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email: "asha@x.test", code: state.asha.accessCode } })
    assert.equal(login.status, 200)
    const stats = (await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })).data.stats
    assert.equal(stats.students, 1)
    assert.equal(stats.pending, 0)
})

test("a rejected registration stays out, and can still be approved later", opts, async () => {
    await call("POST", `/oa/join/${state.token}`, { body: { name: "Ravi Kumar", email: "ravi@x.test" } })
    const ravi = (await call("GET", `/oa/assessments/${state.a}/students?approval=PENDING`, { token: state.admin })).data[0]
    const rejected = await call("POST", `/oa/assessments/${state.a}/students/decide`, { token: state.admin, body: { decision: "REJECT", studentIds: [ravi.id] } })
    assert.equal(rejected.data.invited, null)
    assert.equal((await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email: "ravi@x.test", code: ravi.accessCode } })).status, 401)
    assert.equal((await call("GET", `/oa/assessments/${state.a}/students?approval=REJECTED`, { token: state.admin })).data.length, 1)
    assert.equal((await call("POST", `/oa/assessments/${state.a}/students/decide`, { token: state.admin, body: { decision: "REJECT", studentIds: [ravi.id] } })).status, 409)   // cannot reject twice
    const again = await call("POST", `/oa/assessments/${state.a}/students/decide`, { token: state.admin, body: { decision: "APPROVE", studentIds: [ravi.id] } })
    assert.equal(again.data.decided, 1)
})

test("a limit and a closing time shut registration, and a new link retires the old one", opts, async () => {
    // two people registered through the link so far: a limit of two means it is full
    await call("PUT", `/oa/assessments/${state.a}/registration`, { token: state.admin, body: { maxRegistrations: 2 } })
    assert.equal((await call("GET", `/oa/join/${state.token}`)).data.open, false)
    const full = await call("POST", `/oa/join/${state.token}`, { body: { name: "Late Comer", email: "late@x.test" } })
    assert.equal(full.status, 409)
    assert.equal(full.error.code, "REGISTRATION_CLOSED")

    await call("PUT", `/oa/assessments/${state.a}/registration`, { token: state.admin, body: { maxRegistrations: null, closesAt: new Date(Date.now() - 1000).toISOString() } })
    assert.equal((await call("GET", `/oa/join/${state.token}`)).data.open, false)
    await call("PUT", `/oa/assessments/${state.a}/registration`, { token: state.admin, body: { closesAt: null } })
    assert.equal((await call("GET", `/oa/join/${state.token}`)).data.open, true)

    const rotated = await call("PUT", `/oa/assessments/${state.a}/registration`, { token: state.admin, body: { rotate: true } })
    assert.notEqual(rotated.data.registration.token, state.token)
    assert.equal((await call("GET", `/oa/join/${state.token}`)).status, 404)
    assert.equal((await call("GET", `/oa/join/${rotated.data.registration.token}`)).status, 200)
    await call("PUT", `/oa/assessments/${state.a}/registration`, { token: state.admin, body: { enabled: false } })
    assert.equal((await call("GET", `/oa/join/${rotated.data.registration.token}`)).data.open, false)
})
