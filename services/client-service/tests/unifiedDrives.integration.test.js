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
const oid = () => new mongoose.Types.ObjectId()
const tokenFor = async (tenantId, permissions = ["CLIENT_SELF_READ"]) => (await import("jsonwebtoken")).default.sign({ sub: "507f1f77bcf86cd799439011", email: "hr@x.test", tenantId: tenantId ? String(tenantId) : undefined, permissions }, process.env.ACCESS_TOKEN_SECRET)
const list = (query = "", token = state.token) => call("GET", `/organization/all-drives${query ? `?${query}` : ""}`, { token })
const cand = (n) => ({ name: `Cand ${n}`, email: `c${n}@x.test` })

test("set up: an organization with classic AI drives and a multi-round drive that uses one of them", opts, async () => {
    const { InterviewDrive } = await import("../models/interviewDrive.model.js")
    state.tenant = oid(); state.other = oid()
    const make = (tenantId, title, status, candidates, extra = {}) => InterviewDrive.create({ tenantId: String(tenantId), title, status, roleCategory: "SOFTWARE_ENGINEERING", department: "ENGINEERING", experienceLevel: "1_3_YEARS", expiryDate: new Date("2027-01-01"), rounds: [{ roundNumber: 1, title: "Screening", type: "Screening", status: "ACTIVE", candidates }], ...extra })
    await make(state.tenant, "Backend Engineer Hiring", "ACTIVE", [cand(1), cand(2), cand(3)])
    state.linked = await make(state.tenant, "AI Round For Campus", "ACTIVE", [cand(4)])
    state.partOf = await make(state.tenant, "AI Part Of A Test", "ACTIVE", [cand(7)])
    await make(state.tenant, "Old Sales Drive", "ARCHIVED", [cand(5)])
    await make(state.other, "Someone Else's Secret Drive", "ACTIVE", [cand(6)])

    // the organization's online-assessment account, with a drive: Round 1 test, Round 2 test, Round 3 = the AI interview above
    const account = await models.OaAccount.create({ orgName: "Org", contactName: "Owner", email: "oa@org.test", emailNormalized: "oa@org.test", passwordHash: "x", status: "ACTIVE", tenantId: String(state.tenant) })
    const drive = await models.OaDrive.create({ accountId: account._id, title: "Campus Hiring 2026" })
    const round = (n, kind, extra = {}) => models.OaAssessment.create({ accountId: account._id, title: `Campus Hiring 2026 - Round ${n}`, driveId: drive._id, roundNumber: n, kind, status: "PUBLISHED", sections: [{ id: "s1", title: "" }], ...extra })
    const r1 = await round(1, "TEST"); await round(2, "TEST", { roundLabel: "Coding" }); await round(3, "AI_INTERVIEW", { aiInterviewDriveId: String(state.linked._id) })
    // a test round with an AI interview as its own part: that interview is not a separate drive either
    await round(4, "TEST", { aiPart: { enabled: true, aiInterviewDriveId: String(state.partOf._id), roundNumber: 1, when: "AFTER_SUBMIT" } })
    for (const n of [1, 2, 3, 4]) await models.OaStudent.create({ accountId: account._id, assessmentId: r1._id, name: `S${n}`, email: `s${n}@x.test`, emailNormalized: `s${n}@x.test`, codeHash: "h", codeEncrypted: "e" })
    // a second organization with its own drive: must stay invisible
    const acc2 = await models.OaAccount.create({ orgName: "Other", contactName: "Owner", email: "oa@other.test", emailNormalized: "oa@other.test", passwordHash: "x", status: "ACTIVE", tenantId: String(state.other) })
    await models.OaDrive.create({ accountId: acc2._id, title: "Other Org Multi Drive" })
    state.token = await tokenFor(state.tenant)
})

test("one list: classic AI drives and multi-round drives together, the linked AI interview shown as a round, nothing from other organizations", opts, async () => {
    const res = await list()
    assert.equal(res.status, 200)
    const titles = res.data.map((d) => d.title)
    assert.deepEqual(titles.sort(), ["Backend Engineer Hiring", "Campus Hiring 2026"].sort())      // archived hidden; the linked AI drive is inside the multi-round drive; nothing from others
    assert.equal(titles.includes("Someone Else's Secret Drive"), false)
    assert.equal(titles.includes("Other Org Multi Drive"), false)
    assert.equal(titles.includes("AI Round For Campus"), false)
    const multi = res.data.find((d) => d.kind === "MULTI")
    assert.equal(titles.includes("AI Part Of A Test"), false)
    assert.deepEqual(multi.rounds.map((r) => `${r.number}:${r.kind}`), ["1:TEST", "2:TEST", "3:AI_INTERVIEW", "4:TEST"])
    assert.equal(multi.rounds[1].name, "Coding")
    assert.equal(multi.rounds[0].candidates, 4)
    const ai = res.data.find((d) => d.kind === "AI")
    assert.equal(ai.candidates, 3); assert.equal(ai.rounds.length, 1); assert.equal(ai.department, "ENGINEERING")
    assert.equal(res.json.meta.total, 2)
})

test("filters: archived, type and search, and pagination", opts, async () => {
    assert.deepEqual((await list("archived=1")).data.map((d) => d.title), ["Old Sales Drive"])
    assert.deepEqual((await list("kind=MULTI")).data.map((d) => d.title), ["Campus Hiring 2026"])
    assert.deepEqual((await list("kind=AI")).data.map((d) => d.title), ["Backend Engineer Hiring"])
    assert.deepEqual((await list("search=campus")).data.map((d) => d.title), ["Campus Hiring 2026"])
    assert.deepEqual((await list("search=ENGINEERING")).data.map((d) => d.title), ["Backend Engineer Hiring"])       // department matches too
    assert.equal((await list("search=" + encodeURIComponent("[(.*"))).data.length, 0)                                  // special characters are text, not a pattern
    const page = await list("pageSize=10&page=2")
    assert.equal(page.data.length, 0); assert.equal(page.json.meta.page, 2); assert.equal(page.json.meta.pageSize, 10); assert.equal(page.json.meta.total, 2)
})

test("who may ask: a signed-in organization member, with a tenant", opts, async () => {
    assert.equal((await call("GET", "/organization/all-drives")).status, 401)
    assert.equal((await list("", await tokenFor(state.tenant, []))).status, 403)
    assert.equal((await list("", await tokenFor(null))).status, 403)                       // no organization on the token
    const empty = await list("", await tokenFor(oid()))                                      // a new organization with nothing yet
    assert.equal(empty.status, 200); assert.equal(empty.data.length, 0)
})

test("notifications: who recently finished a test or an AI interview, only for this organization", opts, async () => {
    const account = await models.OaAccount.findOne({ tenantId: String(state.tenant) })
    const assessment = await models.OaAssessment.findOne({ accountId: account._id, roundNumber: 1 })
    const student = await models.OaStudent.findOne({ accountId: account._id, name: "S1" })
    await models.OaAttempt.create({ accountId: account._id, assessmentId: assessment._id, studentId: student._id, status: "SUBMITTED", submittedAt: new Date(), startedAt: new Date(Date.now() - 3600e3), deadline: new Date(Date.now() + 3600e3), order: {}, percent: 82 })
    const { InterviewDrive } = await import("../models/interviewDrive.model.js")
    await InterviewDrive.updateOne({ tenantId: String(state.tenant), title: "Backend Engineer Hiring" }, { $set: { "rounds.0.candidates.0.status": "COMPLETED", "rounds.0.candidates.0.attemptedDate": new Date(Date.now() - 60e3) } })

    const res = await call("GET", "/organization/notifications", { token: state.token })
    assert.equal(res.status, 200)
    const messages = res.data.map((n) => n.message)
    assert.ok(messages.some((m) => m.startsWith("S1 finished")), JSON.stringify(messages))
    assert.ok(messages.some((m) => m.includes("Cand 1 completed the AI interview")), JSON.stringify(messages))
    assert.ok(new Date(res.data[0].at) >= new Date(res.data[1].at))                    // newest first
    assert.equal(res.data.find((n) => n.message.startsWith("S1")).detail, "Scored 82%")
    // another organization sees none of it, and a token without a tenant is refused
    assert.deepEqual((await call("GET", "/organization/notifications", { token: await tokenFor(state.other) })).data, [])
    assert.equal((await call("GET", "/organization/notifications", { token: await tokenFor(null) })).status, 403)
    assert.equal((await call("GET", "/organization/notifications")).status, 401)
})
