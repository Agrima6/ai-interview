import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import net from "node:net"

// Against a throwaway local mongod; skipped when mongod is not installed.
const hasMongod = spawnSync("mongod", ["--version"]).status === 0
const opts = { skip: hasMongod ? false : "mongod is not installed" }
let mongo, dbPath, mongoose, svc, Communication
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)) }) })

before(async () => {
    process.env.EMAIL_MODE = "mock"; process.env.SERVICE_NAME = "communication-test"; process.env.EMAIL_FROM = "WorkmateIQ <no-reply@workmateiq.com>"
    svc = await import("../services/communication.service.js")
    if (!hasMongod) return
    dbPath = mkdtempSync(path.join(tmpdir(), "mail-test-"))
    let port
    for (let attempt = 0; attempt < 6; attempt++) {
        port = await freePort()
        mongo = spawn("mongod", ["--dbpath", dbPath, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket"], { stdio: "ignore" })
        let exited = false
        mongo.on("exit", () => { exited = true })
        await new Promise((r) => setTimeout(r, 500))
        if (!exited) break
    }
    mongoose = (await import("mongoose")).default
    for (let i = 0; i < 60; i++) { try { await mongoose.connect(`mongodb://127.0.0.1:${port}/mail_test`, { serverSelectionTimeoutMS: 500 }); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
    Communication = (await import("../models/communication.model.js")).default
})

after(async () => {
    await mongoose?.disconnect()
    if (mongo) {
        const closed = new Promise((resolve) => { if (mongo.exitCode !== null) resolve(); else mongo.once("exit", resolve) })
        mongo.kill()
        await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 5000))])
    }
    try { if (dbPath) rmSync(dbPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* ignore */ }
})

test("failures are named, with the provider's own reason", () => {
    const http = (status, data) => ({ message: `Request failed with status code ${status}`, response: { status, data } })
    assert.equal(svc.classifyFailure(http(429, { message: "Too many requests. You can only make 2 requests per second." })).code, "RATE_LIMITED")
    assert.match(svc.classifyFailure(http(429, { message: "Too many requests" })).reason, /^429 Too many requests/)
    assert.equal(svc.classifyFailure(http(503, "unavailable")).code, "PROVIDER_5XX")
    assert.equal(svc.classifyFailure(http(422, { message: "Invalid `to` field" })).code, "REJECTED")
    assert.equal(svc.classifyFailure(http(403, { message: "The workmateiq.com domain is not verified" })).code, "REJECTED")
    assert.equal(svc.classifyFailure({ code: "ETIMEDOUT", message: "connect ETIMEDOUT" }).code, "NETWORK")
    assert.equal(svc.classifyFailure({ code: "EAUTH", message: "Invalid login: 535 Daily user sending limit exceeded" }).code, "RATE_LIMITED")
    assert.ok(svc.classifyFailure(http(500, { x: "y".repeat(2000) })).reason.length <= 300)
    for (const code of ["RATE_LIMITED", "PROVIDER_5XX", "NETWORK"]) assert.ok(svc.RETRYABLE_CODES.includes(code))
    assert.equal(svc.RETRYABLE_CODES.includes("REJECTED"), false)
})

const failed = (over = {}) => Communication.create({ entityType: "CLIENT", entityId: new mongoose.Types.ObjectId(), channel: "EMAIL", eventType: "OA_INVITE", recipient: "a@x.test", destinationMasked: "a***@x.test", subject: "Invite", body: "Hello", html: "<p>Hello</p>", provider: "MOCK", status: "FAILED", attempts: 1, lastErrorCode: "RATE_LIMITED", lastError: "429 Too many requests", failedAt: new Date(Date.now() - 10 * 60 * 1000), fromName: "Nifco", ...over })

test("a temporarily failed email is sent again, once, and records that it went out", opts, async () => {
    const c = await failed()
    const run = await svc.retryFailedEmails({ spacingMs: 0 })
    assert.equal(run.tried, 1); assert.equal(run.sent, 1)
    const after = await Communication.findById(c._id).lean()
    assert.equal(after.status, "MOCK_SENT"); assert.equal(after.attempts, 2); assert.ok(after.sentAt)
    assert.equal((await svc.retryFailedEmails({ spacingMs: 0 })).tried, 0)                     // sent: not again
})

test("an email the provider refused, one tried too often, a stale one, and one retried a moment ago are left alone", opts, async () => {
    await Communication.deleteMany({})
    const refused = await failed({ lastErrorCode: "REJECTED", lastError: "422 Invalid to" })
    const tooMany = await failed({ attempts: 4 })
    const stale = await failed({ failedAt: new Date(Date.now() - 80 * 3600 * 1000) })
    const justNow = await failed({ failedAt: new Date(Date.now() - 5 * 1000) })              // failed seconds ago: wait for the gap
    assert.equal((await svc.retryFailedEmails({ spacingMs: 0 })).tried, 0)
    for (const c of [refused, tooMany, stale, justNow]) assert.equal((await Communication.findById(c._id).lean()).status, "FAILED")
})

test("two sweeps never send the same email twice", opts, async () => {
    await Communication.deleteMany({})
    const c = await failed()
    const [a, b] = await Promise.all([svc.retryFailedEmails({ spacingMs: 0 }), svc.retryFailedEmails({ spacingMs: 0 })])
    assert.equal(a.sent + b.sent, 1)
    assert.equal((await Communication.findById(c._id).lean()).attempts, 2)
})

test("an older failure, saved before reasons were kept, gets one more try", opts, async () => {
    await Communication.deleteMany({})
    const legacy = await failed({ lastErrorCode: "PROVIDER_ERROR", lastError: null, failedAt: new Date(Date.now() - 20 * 3600 * 1000) })
    const run = await svc.retryFailedEmails({ spacingMs: 0 })
    assert.equal(run.tried, 1); assert.equal(run.sent, 1)
    assert.equal((await Communication.findById(legacy._id).lean()).status, "MOCK_SENT")
    // but a failure whose reason IS known to be a refusal is never retried
    const refused = await failed({ lastErrorCode: "PROVIDER_ERROR", lastError: "422 Invalid to" })
    assert.equal((await svc.retryFailedEmails({ spacingMs: 0 })).tried, 0)
    assert.equal((await Communication.findById(refused._id).lean()).status, "FAILED")
})
