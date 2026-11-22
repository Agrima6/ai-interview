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
const SECRET = () => process.env.ACCESS_TOKEN_SECRET
const platformToken = async (permissions) => (await import("jsonwebtoken")).default.sign({ sub: "507f1f77bcf86cd799439011", email: "root@platform.test", permissions }, SECRET())
const oid = () => new mongoose.Types.ObjectId()
const at = (iso) => new Date(iso)
// an id whose embedded timestamp is the day the candidate was "added": that is how the platform dates a roster entry
const idOn = (iso) => mongoose.Types.ObjectId.createFromTime(Math.floor(new Date(iso).getTime() / 1000))
const NOV = "from=2026-11-01&to=2026-11-30"
const get = (url, token = state.root) => call("GET", `/admin/billing${url}`, { token })

const candidate = (email, name, added, extra = {}) => ({ _id: idOn(added), name, email, status: "INVITED", ...extra })
const drive = (tenantId, title, rounds, kind = "HIRING") => state.Drive.create({
    tenantId: String(tenantId), title, driveKind: kind, roleCategory: "SOFTWARE_ENGINEERING", department: "ENGINEERING", experienceLevel: "1_3_YEARS",
    expiryDate: at("2027-01-01"), createdAt: at("2026-10-01"), rounds,
})

test("set up: two clients, AI interview drives and online tests with a known mix of candidates", opts, async () => {
    const { default: Client } = await import("../models/client.model.js")
    const { InterviewDrive } = await import("../models/interviewDrive.model.js")
    state.Drive = InterviewDrive
    state.tA = oid(); state.tB = oid()
    const base = (tenantId, name, type) => ({ onboardingId: oid(), registrationId: oid(), tenantId, type, name, status: "ACTIVE", primaryContact: { name: `${name} Owner`, email: `owner@${name.split(" ")[0].toLowerCase()}.test`, phone: "9876543210" } })
    await Client.create([base(state.tA, "Acme Corp", "ORGANIZATION"), base(state.tB, "Delhi College", "COLLEGE")])

    // Acme: one drive, two rounds
    await drive(state.tA, "Backend Hiring", [
        { roundNumber: 1, title: "Technical", type: "Technical Round", candidates: [
            candidate("asha@a.test", "Asha Verma", "2026-11-05", { status: "COMPLETED", attemptedDate: at("2026-11-10T10:00:00Z"), aiScore: 80 }),
            candidate("ravi@a.test", "Ravi Kumar", "2026-11-05", { status: "SHORTLISTED", attemptedDate: at("2026-11-12T10:00:00Z"), aiScore: 70 }),
            candidate("meera@a.test", "Meera Nair", "2026-11-05"),
            candidate("kiran@a.test", "Kiran Rao", "2026-11-05", { status: "CLOSED" }),
            candidate("sam@a.test", "Sam Started", "2026-11-05", { status: "SCHEDULED", agentInterviewId: "agent-123" }),
            candidate("demo@a.test", "Demo Candidate", "2026-11-05", { status: "SCHEDULED", demoAlwaysLive: true, attemptedDate: at("2026-11-11T10:00:00Z") }),
            candidate("old@a.test", "Olga Older", "2026-10-02", { status: "COMPLETED", attemptedDate: at("2026-11-03T10:00:00Z"), aiScore: 60 }),
            candidate("last@a.test", "Last Month", "2026-10-20", { status: "COMPLETED", attemptedDate: at("2026-10-25T10:00:00Z"), aiScore: 50 }),
            candidate("=cmd@a.test", "=HYPERLINK(\"x\")", "2026-11-06"),
        ] },
        { roundNumber: 2, title: "HR", type: "HR Round", candidates: [
            candidate("asha@a.test", "Asha Verma", "2026-11-14", { status: "COMPLETED", attemptedDate: at("2026-11-16T10:00:00Z"), aiScore: 90 }),
        ] },
    ])
    // The college: one exam drive, two students registered in November, one of them sat it
    await drive(state.tB, "Placement Screening", [
        { roundNumber: 1, title: "Screening", type: "Screening", candidates: [
            candidate("stu1@b.test", "Student One", "2026-11-07", { status: "COMPLETED", attemptedDate: at("2026-11-08T10:00:00Z"), aiScore: 75 }),
            candidate("stu2@b.test", "Student Two", "2026-11-07"),
        ] },
    ], "EXAM")

    // Online tests: Acme's account (linked to the same organization), and a standalone account with no platform organization
    const account = (orgName, email, tenantId) => models.OaAccount.create({ orgName, contactName: "Owner", email, emailNormalized: email, passwordHash: "x", status: "ACTIVE", tenantId: tenantId ? String(tenantId) : null })
    const acmeOa = await account("Acme Corp", "oa@acme.test", state.tA)
    const solo = await account("Solo Tests Ltd", "oa@solo.test", null)
    state.soloKey = `oa:${solo._id}`
    const test = (acc, title) => models.OaAssessment.create({ accountId: acc._id, title, status: "PUBLISHED", sections: [{ id: "s1", title: "" }] })
    const aT = await test(acmeOa, "Campus Test"); const sT = await test(solo, "Skill Check")
    const student = (acc, a, n, extra = {}) => models.OaStudent.create({ accountId: acc._id, assessmentId: a._id, name: `Student ${n}`, email: `s${n}@${acc === solo ? "solo" : "oa"}.test`, emailNormalized: `s${n}@${acc === solo ? "solo" : "oa"}.test`, phone: null, codeHash: "h", codeEncrypted: "e", createdAt: at("2026-11-08T08:00:00Z"), ...extra })
    const attempt = (acc, a, s, status, extra = {}) => models.OaAttempt.create({ accountId: acc._id, assessmentId: a._id, studentId: s._id, status, startedAt: at("2026-11-09T08:00:00Z"), deadline: at("2026-11-09T09:00:00Z"), order: {}, percent: 64, ...extra })
    const s1 = await student(acmeOa, aT, 1); const s2 = await student(acmeOa, aT, 2); await student(acmeOa, aT, 3)
    await student(acmeOa, aT, 4, { approval: { status: "PENDING", source: "SELF" } }); await student(acmeOa, aT, 5, { approval: { status: "REJECTED", source: "SELF" } })
    await attempt(acmeOa, aT, s1, "SUBMITTED", { submittedAt: at("2026-11-09T08:40:00Z") })
    await attempt(acmeOa, aT, s2, "IN_PROGRESS")
    const t1 = await student(solo, sT, 1)
    await attempt(solo, sT, t1, "AUTO_SUBMITTED", { submittedAt: at("2026-11-09T09:00:00Z") })

    state.root = await platformToken(["SETTINGS_WRITE"])
    state.A = String(state.tA); state.B = String(state.tB)
})

test("only a platform administrator can see billing", opts, async () => {
    assert.equal((await call("GET", `/admin/billing/summary?${NOV}`)).status, 401)
    assert.equal((await call("GET", `/admin/billing/summary?${NOV}`, { token: await platformToken(["CLIENT_READ"]) })).status, 403)
    const reg = await call("POST", "/oa/auth/register", { body: { orgName: "Nosy College", contactName: "Nosy", email: "nosy@x.test", password: "Sup3rSecret" } })
    await models.OaAccount.updateOne({ _id: reg.data.id }, { $set: { status: "ACTIVE" } })
    const oaToken = (await call("POST", "/oa/auth/login", { body: { email: "nosy@x.test", password: "Sup3rSecret" } })).data.token
    assert.equal((await call("GET", `/admin/billing/summary?${NOV}`, { token: oaToken })).status, 401)      // an organization's own token never works here
    assert.equal((await call("PUT", "/admin/billing/rates/DEFAULT", { token: await platformToken(["CLIENT_READ"]), body: { aiRate: 1 } })).status, 403)
})

test("the numbers: registered, gave the interview, still pending, missed, and what is billable", opts, async () => {
    await call("PUT", "/admin/billing/rates/DEFAULT", { token: state.root, body: { aiRate: 100, oaRate: 50, gstPercent: 18 } })
    const res = await get(`/summary?${NOV}`)
    assert.equal(res.status, 200)
    const orgs = Object.fromEntries(res.data.organizations.map((o) => [o.name, o]))
    const a = orgs["Acme Corp"]
    // AI interviews at Acme: asha, ravi, meera, kiran, sam, and the "=cmd" one registered in November; the demo candidate never counts
    assert.equal(a.ai.registered, 6)
    assert.equal(a.ai.gave, 2)            // asha, ravi
    assert.equal(a.ai.pending, 2)         // meera and "=cmd"
    assert.equal(a.ai.missed, 1)          // kiran: the round closed
    assert.equal(a.ai.started, 1)         // sam opened the room and never finished
    assert.equal(a.ai.interviews, 4)      // asha twice (two rounds), ravi, and Olga who registered in October but sat in November
    assert.equal(a.ai.billableCandidates, 3)   // asha once, ravi, Olga
    // online tests at Acme: students 1-3 registered (4 awaits approval, 5 rejected); one finished, one is still in progress
    assert.equal(a.oa.registered, 3)
    assert.equal(a.oa.gave, 1); assert.equal(a.oa.started, 1); assert.equal(a.oa.pending, 1); assert.equal(a.oa.awaiting, 1)
    assert.equal(a.oa.billableCandidates, 1)
    assert.equal(a.registered, 9); assert.equal(a.gaveOfRegistered, 3); assert.equal(a.billableUnits, 4)
    assert.equal(a.conversionPercent, 33.33)
    assert.equal(a.amountExGst, 350)      // 3 x 100 + 1 x 50
    assert.equal(a.gstAmount, 63)
    assert.equal(a.total, 413)

    const college = orgs["Delhi College"]
    assert.equal(college.registered, 2); assert.equal(college.gaveOfRegistered, 1); assert.equal(college.pending, 1)
    assert.equal(college.amountExGst, 100)
    const solo = orgs["Solo Tests Ltd"]
    assert.equal(solo.kind, "ONLINE_ASSESSMENT"); assert.equal(solo.registered, 1); assert.equal(solo.billableUnits, 1); assert.equal(solo.amountExGst, 50)

    const t = res.data.totals
    assert.equal(t.organizations, 3)
    assert.equal(t.registered, 12); assert.equal(t.gaveOfRegistered, 5); assert.equal(t.billableUnits, 6)
    assert.equal(t.amountExGst, 500); assert.equal(t.gstAmount, 90); assert.equal(t.total, 590)
    assert.equal(res.data.trend.length, 6)
    assert.equal(res.data.trend.at(-1).month, "2026-11")
    assert.equal(res.data.trend.at(-1).amountExGst, 500)
    assert.equal(res.data.trend.find((m) => m.month === "2026-10").candidates, 1)       // Last Month, who sat on 25 October
})

test("the same data cut by product and by period", opts, async () => {
    const ai = (await get(`/summary?${NOV}&product=AI_INTERVIEW`)).data
    assert.equal(ai.totals.aiBillable, 4)            // 3 at Acme + 1 at the college
    assert.equal(ai.totals.oaBillable, 0)
    assert.equal(ai.organizations.find((o) => o.name === "Solo Tests Ltd"), undefined)
    const oa = (await get(`/summary?${NOV}&product=ONLINE_ASSESSMENT`)).data
    assert.equal(oa.totals.oaBillable, 2)
    const oct = (await get("/summary?from=2026-10-01&to=2026-10-31")).data
    assert.equal(oct.organizations.find((o) => o.name === "Acme Corp").ai.billableCandidates, 1)     // Last Month on 25 October
    assert.equal(oct.organizations.find((o) => o.name === "Acme Corp").ai.registered, 2)              // Olga (2 Oct) and Last Month (20 Oct)
})

test("one organization in detail, line by line, adding up to the invoice", opts, async () => {
    const detail = await get(`/organizations/${state.A}?${NOV}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.data.organization.total, 413)
    assert.equal(detail.data.rates.aiRate, 100); assert.equal(detail.data.rates.custom.aiRate, null)    // uses the default card
    assert.deepEqual(detail.data.sources.map((s) => s.title).sort(), ["Backend Hiring", "Campus Test · Round 1"].sort())

    const lines = await get(`/organizations/${state.A}/lines?${NOV}&pageSize=100`)
    assert.equal(lines.status, 200)
    assert.equal(lines.data.reduce((sum, l) => sum + l.units, 0), 4)         // billing units on the lines equal the billable count
    const asha = lines.data.filter((l) => l.email === "asha@a.test")
    assert.equal(asha.length, 1); assert.equal(asha[0].interviewsInPeriod, 2); assert.equal(asha[0].units, 1)   // two rounds, billed once
    const awaiting = lines.data.find((l) => l.name === "Student 4")
    assert.equal(awaiting.outcome, "AWAITING_APPROVAL"); assert.equal(awaiting.units, 0)      // registered through the open link, not approved: never billed
    assert.equal(lines.data.find((l) => l.name === "Student 5"), undefined)                      // rejected: not a candidate at all
    const gave = await get(`/organizations/${state.A}/lines?${NOV}&outcome=GAVE&pageSize=100`)
    assert.ok(gave.data.every((l) => l.outcome === "GAVE"))
    const found = await get(`/organizations/${state.A}/lines?${NOV}&search=meera`)
    assert.equal(found.data.length, 1); assert.equal(found.data[0].outcome, "PENDING")
    assert.equal(found.meta?.total ?? found.json.meta.total, 1)
    const billable = await get(`/organizations/${state.A}/lines?${NOV}&billable=1&pageSize=100`)
    assert.equal(billable.data.length, 4)
    const people = await get(`/organizations/${state.A}/lines?${NOV}&pageSize=100&view=people`)
    assert.equal(people.data.reduce((sum, c) => sum + c.units, 0), 4)                          // one row per candidate; billed units still add up
    assert.equal(new Set(people.data.map((c) => c.email)).size, people.data.length)
    assert.equal(people.data.reduce((n, c) => n + c.items.length, 0), lines.data.length)       // every drive/test line sits under its candidate
    const page = await get(`/organizations/${state.A}/lines?${NOV}&pageSize=10&page=2`)
    assert.equal(page.json.meta.pageSize, 10); assert.equal(page.json.meta.page, 2)
    // the standalone online-test account works as an organization too
    assert.equal((await get(`/organizations/${state.soloKey}?${NOV}`)).data.organization.name, "Solo Tests Ltd")
})

test("rates: a client's own card, per-interview billing, GST, and strict validation", opts, async () => {
    const saved = await call("PUT", `/admin/billing/rates/${state.A}`, { token: state.root, body: { aiRate: 150, unit: "INTERVIEW", gstPercent: 5, notes: "Annual plan" } })
    assert.equal(saved.status, 200)
    const a = (await get(`/summary?${NOV}`)).data.organizations.find((o) => o.name === "Acme Corp")
    assert.equal(a.unit, "INTERVIEW")
    assert.equal(a.ai.billableUnits, 4)                  // every interview round counts: 4 rounds
    assert.equal(a.oa.billableUnits, 1)
    assert.equal(a.amountExGst, 650)                     // 4 x 150 + 1 x 50 (online test rate still the default)
    assert.equal(a.gstAmount, 32.5); assert.equal(a.total, 682.5)
    assert.equal(a.hasCustomRate, true)
    const detail = (await get(`/organizations/${state.A}?${NOV}`)).data
    assert.equal(detail.rates.notes, "Annual plan"); assert.equal(detail.rates.custom.aiRate, 150)
    const lines = (await get(`/organizations/${state.A}/lines?${NOV}&pageSize=100`)).data
    assert.equal(lines.reduce((s, l) => s + l.units, 0), 5)      // 4 interview rounds + 1 online test, still reconciles
    // clearing a field goes back to the default
    await call("PUT", `/admin/billing/rates/${state.A}`, { token: state.root, body: { aiRate: null, unit: null, gstPercent: null } })
    assert.equal((await get(`/summary?${NOV}`)).data.organizations.find((o) => o.name === "Acme Corp").total, 413)

    for (const bad of [{ aiRate: -1 }, { aiRate: "abc" }, { aiRate: 1.234 }, { oaRate: 100001 }, { gstPercent: 41 }, { unit: "WEEKLY" }, { notes: "x".repeat(501) }, {}]) {
        assert.equal((await call("PUT", `/admin/billing/rates/${state.A}`, { token: state.root, body: bad })).status, 400, JSON.stringify(bad))
    }
    assert.equal((await call("PUT", "/admin/billing/rates/not-a-key", { token: state.root, body: { aiRate: 1 } })).status, 404)
})

test("bad requests are refused clearly", opts, async () => {
    assert.equal((await get("/summary?from=2026-13-40&to=2026-11-30")).status, 400)
    assert.equal((await get("/summary?from=2026-11-30&to=2026-11-01")).status, 400)
    assert.equal((await get("/summary?from=2020-01-01&to=2026-11-30")).status, 400)           // far too long a period
    assert.equal((await get(`/summary?${NOV}&product=DRONES`)).status, 400)
    assert.equal((await get("/organizations/12345")).status, 404)
    assert.equal((await get(`/organizations/${"a".repeat(24)}?${NOV}`)).status, 404)           // well-formed but unknown
})

test("CSV exports: the whole summary and one client's annexure, safe to open in a spreadsheet", opts, async () => {
    const sum = await get(`/export?${NOV}`)
    assert.equal(sum.status, 200)
    assert.match(String(sum.json), /Acme Corp/)
    assert.match(String(sum.json), /TOTAL/)
    assert.match(String(sum.json), /Delhi College/)
    const annex = await get(`/organizations/${state.A}/export?${NOV}`)
    assert.equal(annex.status, 200)
    const csv = String(annex.json)
    assert.match(csv, /Asha Verma/)
    assert.match(csv, /Total billing units/)
    assert.match(csv, /'=HYPERLINK/)           // a name that starts with = is neutralised, so a spreadsheet will not run it
    assert.doesNotMatch(csv, /(^|,)"?=HYPERLINK/m)
})

const ownToken = async (tenantId, permissions = ["CLIENT_SELF_READ"]) => (await import("jsonwebtoken")).default.sign({ sub: "507f1f77bcf86cd799439011", email: "hr@acme.test", tenantId: tenantId ? String(tenantId) : undefined, permissions }, SECRET())
const own = (path = "", token = state.ownA) => call("GET", `/organization/billing${path}`, { token })

test("an organization sees its own billing: the same figures the owner invoices from, and nothing else", opts, async () => {
    state.ownA = await ownToken(state.tA)
    await call("PUT", `/admin/billing/rates/${state.A}`, { token: state.root, body: { aiRate: 100, unit: "CANDIDATE", gstPercent: 18, notes: "Internal: gave 10% discount, do not share" } })
    const res = await own(`?${NOV}`)
    assert.equal(res.status, 200)
    const admin = (await get(`/organizations/${state.A}?${NOV}`)).data
    assert.equal(res.data.organization.total, admin.organization.total)            // identical to the owner's invoice figure
    assert.equal(res.data.organization.total, 413)
    assert.equal(res.data.organization.ai.billableCandidates, 3)
    assert.equal(res.data.rates.aiRate, 100); assert.equal(res.data.rates.gstPercent, 18)
    // what is private to the platform owner never reaches the organization
    const body = JSON.stringify(res.json)
    assert.equal(body.includes("Internal: gave 10% discount"), false)
    assert.equal(res.data.rates.notes, "")
    assert.equal(res.data.organization.hasCustomRate, false)
    assert.equal(body.includes("Delhi College"), false); assert.equal(body.includes("Solo Tests"), false)
})

test("it can see its own candidates and download its own annexure, and only its own", opts, async () => {
    const lines = await own(`/lines?${NOV}&pageSize=100`)
    assert.equal(lines.status, 200)
    assert.ok(lines.data.length > 0)
    assert.ok(lines.data.every((l) => !String(l.email).endsWith("@b.test")))      // none of the college's students
    assert.equal(lines.data.reduce((s, l) => s + l.units, 0), 4)
    const csv = await own(`/export?${NOV}`)
    assert.equal(csv.status, 200)
    assert.match(String(csv.json), /Asha Verma/)
    assert.doesNotMatch(String(csv.json), /Student One/)                            // the college's student
    // the other organization sees its own numbers, not Acme's
    const other = await own(`?${NOV}`, await ownToken(state.tB))
    assert.equal(other.data.organization.registered, 2)
    assert.equal(JSON.stringify(other.json).includes("Acme Corp"), false)
})

test("who may ask for it, and no way to name another organization", opts, async () => {
    assert.equal((await call("GET", `/organization/billing?${NOV}`)).status, 401)
    assert.equal((await own(`?${NOV}`, await ownToken(state.tA, []))).status, 403)
    assert.equal((await own(`?${NOV}`, await ownToken(null))).status, 403)
    assert.equal((await own(`?${NOV}`, await platformToken(["SETTINGS_WRITE"]))).status, 403)    // the owner's token has no organization of its own
    // a key or tenant in the request is ignored: it is always the signed-in organization
    const sneaky = await own(`?${NOV}&key=${state.B}&tenantId=${state.B}`)
    assert.equal(sneaky.data.organization.name, "Acme Corp")
    assert.equal((await call("GET", `/organization/billing/${state.B}`, { token: state.ownA })).status, 404)
    assert.equal((await own("?from=2026-13-40")).status, 400)
})

test("a candidate who gives the online test AND its linked AI interview is billed once at the combined rate", opts, async () => {
    const drv = await state.Drive.findOne({ title: "Backend Hiring" })
    const acme = await models.OaAccount.findOne({ email: "oa@acme.test" })
    const linked = await models.OaAssessment.create({ accountId: acme._id, title: "Backend Test", status: "PUBLISHED", sections: [{ id: "s1", title: "" }], aiPart: { enabled: true, aiInterviewDriveId: String(drv._id), roundNumber: 1, when: "AFTER_SUBMIT" } })
    // Asha gave the AI interview in November and now also sits this test
    const asha = await models.OaStudent.create({ accountId: acme._id, assessmentId: linked._id, name: "Asha Verma", email: "asha@a.test", emailNormalized: "asha@a.test", phone: null, codeHash: "h", codeEncrypted: "e", createdAt: at("2026-11-08T08:00:00Z") })
    await models.OaAttempt.create({ accountId: acme._id, assessmentId: linked._id, studentId: asha._id, status: "SUBMITTED", submittedAt: at("2026-11-09T08:40:00Z"), startedAt: at("2026-11-09T08:00:00Z"), deadline: at("2026-11-09T09:00:00Z"), order: {}, percent: 70 })
    const row = async () => (await get(`/summary?${NOV}`)).data.organizations.find((o) => o.name === "Acme Corp")

    // no combined rate yet: the two are billed separately, exactly as before
    let a = await row()
    assert.equal(a.combo.candidates, 0)
    assert.equal(a.amountExGst, 400)                     // AI: Asha, Ravi, Olga x 100; tests: 2 x 50

    assert.equal((await call("PUT", "/admin/billing/rates/DEFAULT", { token: state.root, body: { comboRate: 120 } })).status, 200)
    a = await row()
    assert.equal(a.combo.candidates, 1); assert.equal(a.comboRate, 120); assert.equal(a.comboAmount, 120)
    assert.equal(a.aiBilledUnits, 2); assert.equal(a.oaBilledUnits, 1)
    assert.equal(a.amountExGst, 370)                     // Ravi, Olga 200 + one test 50 + Asha's combination 120
    assert.equal(a.total, 436.6)
    assert.equal((await get(`/summary?${NOV}`)).data.defaults.comboRate, 120)
    assert.equal((await call("PUT", "/admin/billing/rates/DEFAULT", { token: state.root, body: { comboRate: -5 } })).status, 400)

    // an organization with no linked AI interview is untouched by the combined rate
    const solo = (await get(`/summary?${NOV}`)).data.organizations.find((o) => o.name === "Solo Tests Ltd")
    assert.equal(solo.combo.candidates, 0)
    await call("PUT", "/admin/billing/rates/DEFAULT", { token: state.root, body: { comboRate: null } })
})

test("billing shows only what each client created; a client with only combined drives pays the one package price", opts, async () => {
    const { default: Client } = await import("../models/client.model.js")
    const tC = oid()
    await Client.create({ onboardingId: oid(), registrationId: oid(), tenantId: tC, type: "ORGANIZATION", name: "Combo Co", status: "ACTIVE", primaryContact: { name: "Owner", email: "owner@combo.test", phone: "9876543210" } })
    const aiDrive = await drive(tC, "Combo AI Round", [{ roundNumber: 1, title: "AI", type: "Screening", candidates: [candidate("cc@c.test", "Cee Cee", "2026-11-05", { status: "COMPLETED", attemptedDate: at("2026-11-10T10:00:00Z"), aiScore: 70 })] }])
    const acc = await models.OaAccount.create({ orgName: "Combo Co", contactName: "Owner", email: "oa@combo.test", emailNormalized: "oa@combo.test", passwordHash: "x", status: "ACTIVE", tenantId: String(tC) })
    const test = await models.OaAssessment.create({ accountId: acc._id, title: "Combo Test", status: "PUBLISHED", sections: [{ id: "s1", title: "" }], aiPart: { enabled: true, aiInterviewDriveId: String(aiDrive._id), roundNumber: 1, when: "AFTER_SUBMIT" } })
    const sit = async (email, n) => {
        const st = await models.OaStudent.create({ accountId: acc._id, assessmentId: test._id, name: `P${n}`, email, emailNormalized: email, phone: null, codeHash: "h", codeEncrypted: "e", createdAt: at("2026-11-08T08:00:00Z") })
        await models.OaAttempt.create({ accountId: acc._id, assessmentId: test._id, studentId: st._id, status: "SUBMITTED", submittedAt: at("2026-11-09T08:40:00Z"), startedAt: at("2026-11-09T08:00:00Z"), deadline: at("2026-11-09T09:00:00Z"), order: {}, percent: 60 })
    }
    await sit("cc@c.test", 1)         // gave both parts
    await sit("dd@c.test", 2)         // gave the test only
    const row = async () => (await get(`/summary?${NOV}`)).data.organizations.find((o) => o.name === "Combo Co")

    assert.deepEqual(await row().then((o) => o.uses), { oa: false, ai: false, combo: true })
    const acme = (await get(`/summary?${NOV}`)).data.organizations.find((o) => o.name === "Acme Corp")
    assert.equal(acme.uses.ai, true); assert.equal(acme.uses.oa, true)            // Acme runs a test and a stand-alone AI drive
    const solo = (await get(`/summary?${NOV}`)).data.organizations.find((o) => o.name === "Solo Tests Ltd")
    assert.deepEqual(solo.uses, { oa: true, ai: false, combo: false })              // tests only: no AI or combined rows to show

    const unpriced = await row()
    assert.equal(unpriced.combo.candidates, 2); assert.equal(unpriced.rateMissing, true)      // people are counted, and the missing price is flagged
    await call("PUT", "/admin/billing/rates/DEFAULT", { token: state.root, body: { comboRate: 250 } })
    const c = await row()
    assert.equal(c.combo.candidates, 2)                                              // both people, one package each
    assert.equal(c.amountExGst, 500); assert.equal(c.aiBilledUnits, 0); assert.equal(c.oaBilledUnits, 0)
    assert.equal(c.rateMissing, false)
    await call("PUT", "/admin/billing/rates/DEFAULT", { token: state.root, body: { comboRate: null } })
})

test("a test and its AI interview read as ONE drive with two parts, per candidate and in the drive list", opts, async () => {
    const lines = (await get(`/organizations/${state.tA ? String(state.tA) : state.A}/lines?${NOV}&pageSize=100&search=asha`)).data
    const ashas = lines.filter((l) => l.email === "asha@a.test" && l.part)
    assert.deepEqual(ashas.map((l) => l.part), ["Online test", "AI interview"])            // together, test first
    assert.equal(new Set(ashas.map((l) => l.source)).size, 1)                                // under the same drive name
    assert.equal(ashas.reduce((n, l) => n + l.units, 0), 1)                                  // billed once for the drive, not once per part
    const detail = (await get(`/organizations/${state.A}?${NOV}`)).data
    const pkg = detail.sources.find((s) => s.product === "PACKAGE")
    assert.ok(pkg, "no combined drive in the list")
    assert.equal(pkg.title, "Backend Test")
    assert.equal(detail.sources.some((s) => s.product === "AI_INTERVIEW" && s.title === "Backend Hiring"), false)    // the two halves are not listed on their own
    assert.equal(detail.sources.some((s) => s.product === "ONLINE_ASSESSMENT" && /Backend Test/.test(s.title)), false)
    const csv = await call("GET", `/admin/billing/organizations/${state.A}/export?${NOV}`, { token: state.root })
    assert.match(String(csv.json), /Online test \+ AI interview \(AI interview\)/)
})
