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

let mongo, dbPath, server, base, mongoose, models, drives
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)) }) })

before(async () => {
    if (!hasMongod) return
    dbPath = mkdtempSync(path.join(tmpdir(), "oa-aipart-"))
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
    process.env.MONGODB_URL = `mongodb://127.0.0.1:${port}/oa_aipart_test`
    process.env.ACCESS_TOKEN_SECRET = "test-secret"
    process.env.SERVICE_NAME = "client-service-test"
    process.env.COMMUNICATION_SERVICE_URL = "http://127.0.0.1:9"
    process.env.COMMUNICATION_SERVICE_API_KEY = "x"
    // (no AI provider needed here)
    mongoose = (await import("mongoose")).default
    for (let i = 0; i < 60; i++) { try { await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 500 }); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
    models = await import("../models/oa.model.js")
    drives = await import("../models/interviewDrive.model.js")
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
const waitFor = async (fn) => { let v; for (let i = 0; i < 60 && !(v = await fn()); i++) await new Promise((r) => setTimeout(r, 150)); return v }

const sit = async (finish = "submit") => {
    const email = `c${Math.random().toString(36).slice(2, 8)}@part.test`
    await call("POST", `/oa/assessments/${state.a}/students`, { token: state.admin, body: { students: [{ name: "Asha Verma", email }] } })
    const s = (await call("GET", `/oa/assessments/${state.a}/students?search=${email}`, { token: state.admin })).data[0]
    const token = (await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email, code: s.accessCode } })).data.token
    await call("POST", "/oa/exam/start", { token, body: { environment: { userAgent: "t" } } })

    if (finish === "submit") await call("POST", "/oa/exam/submit", { token })
    else {
        const attempt = await models.OaAttempt.findOne({ assessmentId: state.a, studentId: s.id })
        const { finalizeAttempt } = await import("../services/oaExam.service.js")
        await finalizeAttempt(attempt._id, { status: "TERMINATED", reason: "test" })
    }
    state.lastToken = token
    return email
}
const onAi = (email) => drives.InterviewDrive.findById(state.ai).then((d) => d.rounds[0].candidates.some((c) => c.email === email))

test("set up: a published test and an AI interview of the same organization", opts, async () => {
    const reg = await call("POST", "/oa/auth/register", { body: { orgName: "Part Org", contactName: "Ana Owner", email: "owner@part.test", password: "Sup3rSecret" } })
    await models.OaAccount.updateOne({ _id: reg.data.id }, { $set: { status: "ACTIVE", tenantId: "507f1f77bcf86cd799439011" } })
    state.admin = (await call("POST", "/oa/auth/login", { body: { email: "owner@part.test", password: "Sup3rSecret" } })).data.token
    state.a = (await call("POST", "/oa/assessments", { token: state.admin, body: { title: "Test with AI part" } })).data.id
    await call("POST", `/oa/assessments/${state.a}/questions`, { token: state.admin, body: { questions: [{ type: "MCQ", text: "Pick: which?", marks: 1, options: ["a", "b"], correct: "a" }] } })
    await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: {
        schedule: { mode: "FLEXIBLE", startAt: future(-60000), endAt: future(7 * 24 * 3600 * 1000), durationMinutes: 30, timezone: "Asia/Kolkata" },
        proctoring: { level: "STANDARD", requireCamera: false, requireScreenShare: false, requireFullscreen: false, faceChecks: false, blockCopyPaste: false, requireLocation: false, maxViolations: 5, snapshotIntervalSec: 45 },
    } })
    assert.equal((await call("POST", `/oa/assessments/${state.a}/publish`, { token: state.admin })).status, 200)
    const ai = await drives.InterviewDrive.create({ tenantId: "507f1f77bcf86cd799439011", title: "AI screen", status: "ACTIVE", roleCategory: "SOFTWARE_ENGINEERING", department: "ENGINEERING", experienceLevel: "1_3_YEARS", expiryDate: new Date("2027-01-01"), rounds: [{ roundNumber: 1, title: "Screening", type: "Screening", status: "ACTIVE", candidates: [] }] })
    state.ai = String(ai._id)
})

test("turning the AI part on needs an AI interview, and it is off by default", opts, async () => {
    const before = await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })
    assert.equal(before.data.aiPart.enabled, false)
    const bad = await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { aiPart: { enabled: true } } })
    assert.equal(bad.status, 400)
    const ok = await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { aiPart: { enabled: true, aiInterviewDriveId: state.ai, roundNumber: 1 } } })
    assert.equal(ok.status, 200)
    assert.equal(ok.data.aiPart.enabled, true)
    assert.equal(ok.data.aiPart.aiInterviewDriveId, state.ai)
})

test("whoever submits the test is added to the AI interview once; someone removed for cheating is not", opts, async () => {
    const a = await sit("submit")
    assert.ok(await waitFor(() => onAi(a)), "the candidate was never added to the AI interview")
    const row = await waitFor(async () => (await call("GET", `/oa/assessments/${state.a}/results`, { token: state.admin })).data.find((r) => r.email === a && r.aiInvite && r.aiInvite !== "SENDING"))
    assert.ok(["SENT", "ALREADY", "ADDED"].includes(row.aiInvite))
    const cheat = await sit("terminate")
    await new Promise((r) => setTimeout(r, 800))
    assert.equal(await onAi(cheat), false)
    const drive = await drives.InterviewDrive.findById(state.ai)
    assert.equal(drive.rounds[0].candidates.filter((c) => c.email === a).length, 1)
})

test("with the AI part off, submitting adds no one", opts, async () => {
    await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { aiPart: { enabled: false } } })
    const b = await sit("submit")
    await new Promise((r) => setTimeout(r, 800))
    assert.equal(await onAi(b), false)
})

test("review mode: nobody is invited on submit; the organizer invites by score and it is safe to repeat", opts, async () => {
    await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { aiPart: { enabled: true, aiInterviewDriveId: state.ai, roundNumber: 1, when: "AFTER_REVIEW" } } })
    const c = await sit("submit")
    await new Promise((r) => setTimeout(r, 800))
    assert.equal(await onAi(c), false, "invited automatically although the organizer reviews first")
    const none = await call("POST", `/oa/assessments/${state.a}/ai-invites`, { token: state.admin, body: { minPercent: 101 } })
    assert.equal(none.data.considered, 0)
    const some = await call("POST", `/oa/assessments/${state.a}/ai-invites`, { token: state.admin, body: { minPercent: 0 } })
    assert.ok(some.data.invited >= 1)
    assert.ok(await onAi(c))
    const again = await call("POST", `/oa/assessments/${state.a}/ai-invites`, { token: state.admin, body: { minPercent: 0 } })
    assert.equal(again.data.invited, 0)
})

test("job details are filled once on the hiring drive, kept, and cleaned", opts, async () => {
    const made = await call("POST", "/oa/drives", { token: state.admin, body: { title: "Campus 2026", kind: "TEST", department: "Engineering", roleCategory: "SOFTWARE_ENGINEERING", experienceLevel: "0-1 yr (Fresher)" } })
    assert.equal(made.status, 201 === made.status ? 201 : 200)
    assert.equal(made.data.department, "Engineering")
    assert.equal(made.data.roleCategory, "SOFTWARE_ENGINEERING")
    const edited = await call("PATCH", `/oa/drives/${made.data.id}`, { token: state.admin, body: { department: "Legal\u0007  ", roleCategory: "x".repeat(200) } })
    assert.equal(edited.data.department, "Legal")
    assert.equal(edited.data.roleCategory.length, 80)
    assert.equal(edited.data.experienceLevel, "0-1 yr (Fresher)")
})

test("same sitting: after the test the candidate gets a one-time ticket into the AI interview, with no email", opts, async () => {
    const seen = []
    let mode = "ok"
    const fakeAuth = http.createServer((req, res) => {
        let body = ""
        req.on("data", (c) => { body += c })
        req.on("end", () => {
            seen.push({ url: req.url, body: JSON.parse(body || "{}"), service: req.headers["x-service-name"] })
            res.setHeader("Content-Type", "application/json")
            if (mode === "refuse") { res.statusCode = 409; return res.end(JSON.stringify({ success: false, error: { code: "HANDOFF_NOT_ALLOWED", message: "no" } })) }
            res.end(JSON.stringify({ success: true, data: { ticket: "ticket-abc", expiresInSeconds: 120 } }))
        })
    })
    await new Promise((r) => fakeAuth.listen(0, "127.0.0.1", r))
    process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${fakeAuth.address().port}`
    try {
        await call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { aiPart: { enabled: true, aiInterviewDriveId: state.ai, roundNumber: 1, when: "AFTER_SUBMIT" } } })
        const e = await sit("submit")
        const go = await call("POST", "/oa/exam/ai-interview", { token: state.lastToken })
        assert.equal(go.status, 200)
        assert.equal(go.data.ticket, "ticket-abc")
        assert.equal(go.data.path, `/candidate/interview/${state.ai}/1`)
        assert.equal(go.data.emailed, false)
        assert.ok(await onAi(e))
        assert.equal(seen.at(-1).url, "/internal/v1/candidate-handoffs")
        assert.equal(seen.at(-1).body.email, e)
        assert.equal(seen.at(-1).body.tenantId, "507f1f77bcf86cd799439011")

        const cheat = await sit("terminate")
        const no = await call("POST", "/oa/exam/ai-interview", { token: state.lastToken })
        assert.equal(no.status, 409)
        assert.equal(await onAi(cheat), false)

        mode = "refuse"
        const other = await sit("submit")
        const fallback = await call("POST", "/oa/exam/ai-interview", { token: state.lastToken })
        assert.equal(fallback.status, 200)
        assert.equal(fallback.data.ticket, null)
        assert.equal(fallback.data.emailed, true)
        assert.ok(await onAi(other))
    } finally { fakeAuth.close() }
})

test("a test can have several sections, added and filled", opts, async () => {
    const id = (await call("POST", "/oa/assessments", { token: state.admin, body: { title: "Many sections" } })).data.id
    const one = await call("GET", `/oa/assessments/${id}`, { token: state.admin })
    assert.equal(one.data.sections.length, 1)
    const two = await call("PATCH", `/oa/assessments/${id}`, { token: state.admin, body: { sections: [...one.data.sections, { title: "" }, { title: "Coding" }] } })
    assert.equal(two.status, 200)
    assert.equal(two.data.sections.length, 3)
    const q = await call("POST", `/oa/assessments/${id}/questions`, { token: state.admin, body: { sectionId: two.data.sections[2].id, questions: [{ type: "MCQ", text: "Pick one?", marks: 1, options: ["a", "b"], correct: "a", sectionId: two.data.sections[2].id }] } })
    assert.equal(q.status === 200 || q.status === 201, true)
    const after = await call("GET", `/oa/assessments/${id}`, { token: state.admin })
    assert.equal(after.data.questions[0].sectionId, two.data.sections[2].id)
})

test("two organization sessions opened at the same moment still share ONE Online Assessment account", opts, async () => {
    const tenant = "6a00000000000000000000aa"
    await models.OaAccount.deleteMany({ tenantId: tenant })
    const { orgSession } = await import("../services/oaAccount.service.js")
    const user = { tenantId: tenant, email: "boss@race.test" }
    const sessions = await Promise.all(Array.from({ length: 6 }, () => orgSession(user)))
    assert.equal(await models.OaAccount.countDocuments({ tenantId: tenant }), 1)
    assert.equal(new Set(sessions.map((s) => s.account.id)).size, 1)
})

test("an organization's name and logo are found by the id on its sign-in tokens (its Client _id), and served publicly", opts, async () => {
    const Client = (await import("../models/client.model.js")).default
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const client = await Client.create({ onboardingId: new mongoose.Types.ObjectId(), registrationId: new mongoose.Types.ObjectId(), type: "ORGANIZATION", name: "Brand Co", status: "ACTIVE", primaryContact: { name: "A", email: "a@brand.test", phone: "9876543210" }, branding: { logoUrl: png, primaryColor: "#112233" } })
    assert.equal(client.tenantId, null, "the Client's own tenantId field is empty, as for real organizations")
    const account = await models.OaAccount.create({ orgName: "Typed Name", contactName: "A", email: "brand@x.test", emailNormalized: "brand@x.test", passwordHash: "x", status: "ACTIVE", tenantId: String(client._id) })
    const { brandForAccount, orgBrand } = await import("../services/oaBrand.service.js")
    const brand = await brandForAccount(account)
    assert.equal(brand.name, "Brand Co")
    assert.ok(brand.logoPath, "the logo was not found")
    assert.equal(brand.color, "#112233")
    assert.match(orgBrand(client).logoUrl, new RegExp(`/api/v1/oa/brand/client/${client._id}/logo$`))
    const res = await fetch(`${base}/oa/brand/client/${client._id}/logo`)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get("content-type"), "image/png")
    assert.equal((await fetch(`${base}/oa/brand/client/not-an-id/logo`)).status, 404)
})
