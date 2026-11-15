import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import net from "node:net"

// Field limits and slot booking, driven over HTTP against a throwaway mongod (skipped when mongod is missing).
const hasMongod = spawnSync("mongod", ["--version"]).status === 0
const opts = { skip: hasMongod ? false : "mongod is not installed" }

let mongo, dbPath, server, base, mongoose, models
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)) }) })

before(async () => {
    if (!hasMongod) return
    dbPath = mkdtempSync(path.join(tmpdir(), "oa-slots-"))
    const port = await freePort()
    mongo = spawn("mongod", ["--dbpath", dbPath, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket"], { stdio: "ignore" })
    process.env.MONGODB_URL = `mongodb://127.0.0.1:${port}/oa_slots_test`
    process.env.ACCESS_TOKEN_SECRET = "test-secret"
    process.env.SERVICE_NAME = "client-service-test"
    process.env.COMMUNICATION_SERVICE_URL = "http://127.0.0.1:9"
    process.env.COMMUNICATION_SERVICE_API_KEY = "x"
    mongoose = (await import("mongoose")).default
    for (let i = 0; i < 60; i++) { try { await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 500 }); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
    models = await import("../models/oa.model.js")
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
    const json = (res.headers.get("content-type") || "").includes("json") ? await res.json() : await res.text()
    return { status: res.status, json, data: json?.data, error: json?.error }
}
const platformToken = async (permissions) => (await import("jsonwebtoken")).default.sign({ sub: "507f1f77bcf86cd799439011", permissions }, process.env.ACCESS_TOKEN_SECRET)
const state = {}
const MIN = 60e3

let tries = 0
test("registration enforces real field rules", opts, async () => {
    const good = { orgName: "Limits College", contactName: "Lima Singh", email: "lima@limits.test", password: "Sup3rSecret", phone: "9876543210" }
    for (const [field, value, expected] of [
        ["phone", "12345", "10 digits"], ["phone", "98765abcde", "10 digits"], ["phone", "98765432101", "10 digits"],
        ["contactName", "R2 D2", "letters"], ["contactName", "A", "at least"], ["orgName", "X", "characters"],
        ["email", "nope", "valid email"], ["password", "short", "8 characters"], ["purpose", "x".repeat(501), "500"],
    ]) {
        // the sign-up limiter is per email, so each attempt uses its own address
        const r = await call("POST", "/oa/auth/register", { body: { ...good, email: `try${++tries}@limits.test`, [field]: value } })
        assert.equal(r.status, 400, `${field}=${value}`)
        assert.ok(r.error.fields[field], `${field} should be named in fields`)
        assert.match(r.error.fields[field], new RegExp(expected, "i"), field)
    }
    const ok = await call("POST", "/oa/auth/register", { body: { ...good, phone: "+91 98765-43210" } })
    assert.equal(ok.status, 200)
    const stored = await models.OaAccount.findById(ok.data.id)
    assert.equal(stored.phone, "9876543210")         // stored as plain digits whatever way it was typed
    const checker = await platformToken(["CLIENT_APPROVE"])
    await call("POST", `/oa/platform/accounts/${ok.data.id}/approve`, { token: checker })
    state.admin = (await call("POST", "/oa/auth/login", { body: { email: "lima@limits.test", password: "Sup3rSecret" } })).data.token
    assert.ok(state.admin)
})

test("test settings are rejected out of range, not silently changed", opts, async () => {
    const created = await call("POST", "/oa/assessments", { token: state.admin, body: { title: "Limits Test" } })
    state.a = created.data.id
    const patch = (body) => call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body })
    const future = (m) => new Date(Date.now() + m * MIN)

    for (const [body, field] of [
        [{ proctoring: { maxViolations: 11 } }, "maxViolations"], [{ proctoring: { maxViolations: 0 } }, "maxViolations"],
        [{ proctoring: { maxViolations: "abc" } }, "maxViolations"], [{ proctoring: { maxViolations: 2.5 } }, "maxViolations"],
        [{ proctoring: { maxViolations: "" } }, "maxViolations"],
        [{ proctoring: { snapshotIntervalSec: 14 } }, "snapshotIntervalSec"], [{ proctoring: { snapshotIntervalSec: 301 } }, "snapshotIntervalSec"],
        [{ settings: { passPercent: 101 } }, "passPercent"], [{ settings: { passPercent: -1 } }, "passPercent"], [{ settings: { passPercent: "x" } }, "passPercent"],
        [{ schedule: { startAt: future(60), endAt: future(600), durationMinutes: 4 } }, "durationMinutes"],
        [{ schedule: { startAt: future(60), endAt: future(900), durationMinutes: 361 } }, "durationMinutes"],
        [{ schedule: { startAt: future(60), endAt: future(900), durationMinutes: 60.5 } }, "durationMinutes"],
        [{ schedule: { startAt: future(60), endAt: future(900), durationMinutes: 60, lateEntryMinutes: 121 } }, "lateEntryMinutes"],
        [{ schedule: { startAt: future(60), endAt: future(900), durationMinutes: 60, lateEntryMinutes: -1 } }, "lateEntryMinutes"],
        [{ title: "ab" }, "title"], [{ title: "x".repeat(141) }, "title"],
        [{ description: "x".repeat(2001) }, "description"], [{ instructions: "x".repeat(4001) }, "instructions"], [{ roundLabel: "x".repeat(61) }, "roundLabel"],
    ]) {
        const r = await patch(body)
        assert.equal(r.status, 400, JSON.stringify(body).slice(0, 80))
        assert.ok(r.error.fields?.[field], `${field} should be named for ${JSON.stringify(body).slice(0, 60)}`)
    }
    const ok = await patch({ proctoring: { maxViolations: 10, snapshotIntervalSec: 15 }, settings: { passPercent: 0 } })
    assert.equal(ok.status, 200)
    assert.equal(ok.data.proctoring.maxViolations, 10)
    assert.equal((await patch({ settings: { passPercent: 100 }, proctoring: { maxViolations: 1, snapshotIntervalSec: 300 } })).status, 200)
})

test("student rows are checked one by one, with the reason for each skipped row", opts, async () => {
    const rows = [
        { name: "Asha Verma", email: "asha@c.test", phone: "9876543210" },
        { name: "Bala Iyer", email: "bala@c.test", phone: "+91 98765-43211" },
        { name: "Chitra Rao", email: "chitra@c.test" },
        { name: "Dev Patel", email: "dev@c.test", phone: "12345" },
        { name: "R2D2", email: "r2@c.test", phone: "9876543212" },
        { name: "Esha Nair", email: "esha@c.test", phone: "98765432134" },
        { name: "Farid Khan", email: "farid@c.test", rollNumber: "R".repeat(41) },
        { name: "Gita Menon", email: "x".repeat(200) + "@c.test" },
    ]
    const r = await call("POST", `/oa/assessments/${state.a}/students`, { token: state.admin, body: { students: rows } })
    assert.equal(r.data.added, 3)
    assert.deepEqual(r.data.skipped.map((s) => s.row), [4, 5, 6, 7, 8])
    assert.match(r.data.skipped[0].reason, /10 digits/)
    assert.match(r.data.skipped[1].reason, /letters/)
    const stored = await models.OaStudent.find({ assessmentId: state.a }).sort({ createdAt: 1 }).lean()
    assert.deepEqual(stored.map((s) => s.phone), ["9876543210", "9876543211", null])
})

test("next round and filters refuse nonsense cut-offs", opts, async () => {
    for (const body of [{}, { minPercent: 101 }, { minPercent: -5 }, { topN: 0 }, { topN: 2.5 }, { topN: "x" }]) {
        const r = await call("POST", `/oa/assessments/${state.a}/next-round`, { token: state.admin, body })
        assert.equal(r.status, 400, JSON.stringify(body))
    }
    assert.equal((await call("GET", `/oa/assessments/${state.a}/results?minPercent=150`, { token: state.admin })).status, 400)
    assert.equal((await call("POST", `/oa/assessments/${state.a}/questions/generate`, { token: state.admin, body: { prompt: "Basic SQL for freshers", count: 26 } })).status, 400)
})

test("slots: set up, validate, publish", opts, async () => {
    const patch = (schedule) => call("PATCH", `/oa/assessments/${state.a}`, { token: state.admin, body: { schedule } })
    const at = (m) => new Date(Date.now() + m * MIN)
    const base2 = { mode: "SLOTS", durationMinutes: 60, lateEntryMinutes: 10 }

    for (const [schedule, message] of [
        [{ ...base2, slots: [] }, /at least one/i],
        [{ ...base2, slots: [{ startAt: at(-5) }] }, /past/],
        [{ ...base2, slots: [{ startAt: at(120) }, { startAt: at(120) }] }, /repeats/],
        [{ ...base2, slots: [{ startAt: "garbage" }] }, /date and time/],
        [{ ...base2, slots: [{ startAt: at(120), capacity: 0 }] }, /seats/],
        [{ ...base2, slots: [{ startAt: at(120), capacity: 1.5 }] }, /seats/],
        [{ ...base2, slots: [{ startAt: at(120), capacity: 5001 }] }, /seats/],
        [{ ...base2, slots: Array.from({ length: 41 }, (_, i) => ({ startAt: at(120 + i * 90) })) }, /at most 40/],
    ]) {
        const r = await patch(schedule)
        assert.equal(r.status, 400, message.source)
        assert.match(r.error.message, message)
        assert.ok(r.error.fields)
    }
    const ok = await patch({ ...base2, slots: [{ startAt: at(300), capacity: 1 }, { startAt: at(120) }, { startAt: at(480), capacity: 2 }], timezone: "Asia/Kolkata" })
    assert.equal(ok.status, 200)
    const s = ok.data.schedule
    assert.equal(s.mode, "SLOTS")
    assert.deepEqual(s.slots.map((x) => x.capacity), [null, 1, 2])           // sorted by time
    assert.equal(new Date(s.endAt).getTime(), new Date(s.slots[2].startAt).getTime() + 70 * MIN)
    state.slots = s.slots.map((x) => x.id)

    await call("POST", `/oa/assessments/${state.a}/questions`, { token: state.admin, body: { questions: [{ type: "MCQ", text: "Pick the third", options: ["a", "b", "c", "d"], correct: "C", marks: 1 }] } })
    const pub = await call("POST", `/oa/assessments/${state.a}/publish`, { token: state.admin })
    assert.equal(pub.data.status, "PUBLISHED")

    const invite = await call("POST", `/oa/assessments/${state.a}/students/invite`, { token: state.admin })
    assert.equal(invite.data.attempted, 3)
    const list = await call("GET", `/oa/assessments/${state.a}/students`, { token: state.admin })
    state.students = list.data
    assert.equal(list.data[0].slot, null)                                       // nobody has booked yet
    const detail = await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })
    assert.deepEqual(detail.data.slotUsage, {})
})

test("a student must book a slot before they can start, and sees seats left", opts, async () => {
    for (const s of state.students) {
        const login = await call("POST", "/oa/exam/login", { body: { assessmentId: state.a, email: s.email, code: s.accessCode } })
        s.token = login.data.token
    }
    const [asha] = state.students
    const sess = await call("GET", "/oa/exam/session", { token: asha.token })
    assert.equal(sess.data.assessment.phase, "CHOOSE_SLOT")
    assert.equal(sess.data.canStart, false)
    assert.equal(sess.data.assessment.schedule.startAt, null)
    assert.equal(sess.data.assessment.slots.length, 3)
    assert.equal(sess.data.assessment.slots[1].remaining, 1)
    assert.equal(sess.data.assessment.slots[0].remaining, null)               // unlimited
    assert.equal((await call("POST", "/oa/exam/start", { token: asha.token, body: {} })).error.code, "SLOT_REQUIRED")
    assert.equal((await call("PUT", "/oa/exam/slot", { token: asha.token, body: { slotId: "nope" } })).status, 400)
})

test("booking: capacity is respected, changing is allowed, and the lobby follows the slot", opts, async () => {
    const [asha, bala, chitra] = state.students
    const [open, one, two] = state.slots
    const book = (s, slotId) => call("PUT", "/oa/exam/slot", { token: s.token, body: { slotId } })

    assert.equal((await book(asha, one)).status, 200)
    const full = await book(bala, one)
    assert.equal(full.status, 409)
    assert.equal(full.error.code, "SLOT_FULL")
    assert.equal((await book(asha, one)).status, 200)                          // booking the same slot again is harmless

    const sess = await call("GET", "/oa/exam/session", { token: asha.token })
    assert.equal(sess.data.assessment.phase, "UPCOMING")
    assert.equal(sess.data.assessment.slots.find((x) => x.mine).id, one)
    assert.equal(sess.data.assessment.slots.find((x) => x.id === one).full, false)   // my own seat is not "full" to me
    const startAt = new Date(sess.data.assessment.schedule.startAt).getTime()
    assert.equal(new Date(sess.data.assessment.slots.find((x) => x.id === one).startAt).getTime(), startAt)
    assert.equal(new Date(sess.data.assessment.schedule.endAt).getTime(), startAt + 70 * MIN)

    const bFull = await call("GET", "/oa/exam/session", { token: bala.token })
    assert.equal(bFull.data.assessment.slots.find((x) => x.id === one).full, true)
    assert.equal(bFull.data.assessment.slots.find((x) => x.id === one).bookable, false)

    // Asha moves to the open slot, freeing the seat for Bala
    assert.equal((await book(asha, open)).status, 200)
    assert.equal((await book(bala, one)).status, 200)
    assert.equal((await call("GET", `/oa/assessments/${state.a}`, { token: state.admin })).data.slotUsage[open], 1)

    const list = await call("GET", `/oa/assessments/${state.a}/students`, { token: state.admin })
    assert.equal(list.data.find((s) => s.name === "Asha Verma").slot.id, open)
    assert.equal(list.data.find((s) => s.name === "Chitra Rao").slot, null)

    // the organizer can't be tricked by another test's slot ids, nor can a slot id from nowhere be booked
    assert.equal((await book(chitra, "someone-elses-slot")).status, 400)
})

test("booking race: ten students, three seats, never more than three", opts, async () => {
    const at = (m) => new Date(Date.now() + m * MIN)
    const a = await call("POST", "/oa/assessments", { token: state.admin, body: { title: "Race Test" } })
    const id = a.data.id
    await call("POST", `/oa/assessments/${id}/questions`, { token: state.admin, body: { questions: [{ type: "MCQ", text: "Pick the third", options: ["a", "b", "c", "d"], correct: "C", marks: 1 }] } })
    const sched = await call("PATCH", `/oa/assessments/${id}`, { token: state.admin, body: { schedule: { mode: "SLOTS", durationMinutes: 30, lateEntryMinutes: 5, slots: [{ startAt: at(200), capacity: 3 }] } } })
    const slotId = sched.data.schedule.slots[0].id
    const names = ["Ann", "Ben", "Cat", "Dan", "Eve", "Fay", "Gus", "Hal", "Ivy", "Jon"]
    await call("POST", `/oa/assessments/${id}/students`, { token: state.admin, body: { students: names.map((n) => ({ name: `${n} Test`, email: `${n.toLowerCase()}@race.test` })) } })
    await call("POST", `/oa/assessments/${id}/publish`, { token: state.admin })
    const people = (await call("GET", `/oa/assessments/${id}/students?pageSize=100`, { token: state.admin })).data
    const tokens = await Promise.all(people.map(async (p) => (await call("POST", "/oa/exam/login", { body: { assessmentId: id, email: p.email, code: p.accessCode } })).data.token))
    const results = await Promise.all(tokens.map((token) => call("PUT", "/oa/exam/slot", { token, body: { slotId } })))
    const won = results.filter((r) => r.status === 200).length
    const booked = await models.OaStudent.countDocuments({ assessmentId: id, slotId })
    assert.equal(booked <= 3, true, `booked ${booked}`)
    assert.equal(booked, won)                                                    // every success is a real seat
    assert.ok(results.every((r) => r.status === 200 || r.error.code === "SLOT_FULL" || r.error.code === "CONFLICT"))
})

test("cut-off: a slot starting soon cannot be booked or left, and nothing bookable means NO_SLOT", opts, async () => {
    const [asha, , chitra] = state.students
    const doc = await models.OaAssessment.findById(state.a)
    const [open, one, two] = state.slots
    // Pretend time moved: slot "open" now starts in 10 minutes (inside the 30-minute cut-off), the others are in the past.
    const sched = doc.toObject().schedule
    sched.slots = sched.slots.map((s) => (s.id === open ? { ...s, startAt: new Date(Date.now() + 10 * MIN) } : { ...s, startAt: new Date(Date.now() - 10 * 3600 * 1000) }))
    await models.OaAssessment.updateOne({ _id: state.a }, { $set: { "schedule.slots": sched.slots, "schedule.startAt": sched.slots[0].startAt } })

    const tooLate = await call("PUT", "/oa/exam/slot", { token: chitra.token, body: { slotId: open } })
    assert.equal(tooLate.error.code, "SLOT_CLOSED")
    const sess = await call("GET", "/oa/exam/session", { token: chitra.token })
    assert.equal(sess.data.assessment.phase, "NO_SLOT")                          // nothing left to book, and no booking made

    // Asha booked "open" earlier: it is now too close to change
    const locked = await call("PUT", "/oa/exam/slot", { token: asha.token, body: { slotId: one } })
    assert.ok(["SLOT_LOCKED", "SLOT_CLOSED"].includes(locked.error.code))
})

test("starting follows the booked slot: deadline is slot start + duration, and the slot is then fixed", opts, async () => {
    const [asha, bala] = state.students
    const [open, one] = state.slots
    // The slot Asha holds has opened: it began 2 minutes ago.
    const startedAgo = Date.now() - 2 * MIN
    const doc = await models.OaAssessment.findById(state.a)
    const slots = doc.toObject().schedule.slots.map((s) => (s.id === open ? { ...s, startAt: new Date(startedAgo) } : s))
    await models.OaAssessment.updateOne({ _id: state.a }, { $set: { "schedule.slots": slots } })

    const sess = await call("GET", "/oa/exam/session", { token: asha.token })
    assert.equal(sess.data.assessment.phase, "OPEN")
    assert.equal(sess.data.canStart, true)
    const paper = await call("POST", "/oa/exam/start", { token: asha.token, body: { environment: { userAgent: "t" } } })
    assert.equal(paper.status, 200)
    assert.equal(new Date(paper.data.deadline).getTime() <= startedAgo + 70 * MIN, true)
    assert.equal(new Date(paper.data.deadline).getTime() >= Date.now() + 55 * MIN, true)

    const moved = await call("PUT", "/oa/exam/slot", { token: asha.token, body: { slotId: one } })
    assert.equal(moved.error.code, "ALREADY_STARTED")

    // Bala is booked into a later slot ("one" is still in the past after the earlier pretend step: it ended), so he cannot start
    const early = await call("POST", "/oa/exam/start", { token: bala.token, body: {} })
    assert.equal(early.status, 409)

    const live = await call("GET", `/oa/assessments/${state.a}/live`, { token: state.admin })
    assert.ok(live.data.items.find((r) => r.name === "Asha Verma").slotStartAt)
    const results = await call("GET", `/oa/assessments/${state.a}/results`, { token: state.admin })
    assert.ok(results.data.find((r) => r.name === "Asha Verma").slotStartAt)
})

test("the invitation email lists the slots", opts, async () => {
    const { inviteEmail } = await import("../services/oaMail.js")
    const doc = await models.OaAssessment.findById(state.a)
    const mail = inviteEmail({ assessment: doc.toObject(), student: { name: "Asha Verma", email: "asha@c.test" }, code: "ABCD2345", orgName: "Limits College" })
    assert.match(mail.body, /Pick your own time/)
    assert.match(mail.body, /ABCD2345/)
    assert.match(mail.body, /Choose your time slot/)
    assert.equal((mail.body.match(/^ {2}- /gm) || []).length, 3)
})
