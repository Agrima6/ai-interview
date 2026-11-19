import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import net from "node:net"

// Drives the real app over HTTP against a throwaway local mongod; skipped when mongod is not installed.
const hasMongod = spawnSync("mongod", ["--version"]).status === 0
const opts = { skip: hasMongod ? false : "mongod is not installed" }
let mongo, dbPath, server, base, mongoose, User
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const TENANT = "507f1f77bcf86cd799439011"
const service = { "X-Service-Name": "client-service", "X-Service-API-Key": "svc-secret", "Content-Type": "application/json" }

before(async () => {
    if (!hasMongod) return
    dbPath = mkdtempSync(path.join(tmpdir(), "auth-handoff-"))
    let port
    for (let attempt = 0; attempt < 6; attempt++) {
        port = await freePort()
        mongo = spawn("mongod", ["--dbpath", dbPath, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket"], { stdio: "ignore" })
        let exited = false
        mongo.on("exit", () => { exited = true })
        await new Promise((r) => setTimeout(r, 500))
        if (!exited) break
    }
    process.env.MONGODB_URL = `mongodb://127.0.0.1:${port}/auth_handoff_test`
    process.env.MONGO_URL = process.env.MONGODB_URL
    process.env.ACCESS_TOKEN_SECRET = "test-secret"
    process.env.SERVICE_NAME = "auth-service-test"
    process.env.INCOMING_SERVICE_KEYS = JSON.stringify({ "client-service": "svc-secret" })
    process.env.SERVICE_PERMISSIONS = JSON.stringify({ "client-service": ["CANDIDATE_USER_CREATE"] })
    mongoose = (await import("mongoose")).default
    for (let i = 0; i < 60; i++) { try { await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 500 }); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
    User = (await import("../models/user.model.js")).default
    const roles = await import("../repositories/role.repository.js")
    await roles.upsertSystemRole("CANDIDATE", ["CANDIDATE_SELF"])
    await roles.upsertSystemRole("CLIENT_OWNER", ["CLIENT_SELF_READ"])
    const { default: app } = await import("../app.js")
    await new Promise((resolve) => { server = app.listen(0, resolve) })
    base = `http://127.0.0.1:${server.address().port}`
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

const ticketFor = (body, headers = service) => fetch(`${base}/internal/v1/candidate-handoffs`, { method: "POST", headers, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json() }))
const redeem = (ticket) => fetch(`${base}/api/v1/auth/handoff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket }) }).then(async (r) => ({ status: r.status, json: await r.json(), cookie: r.headers.get("set-cookie") }))

test("a ticket for a new candidate becomes a candidate session, once", opts, async () => {
    const made = await ticketFor({ email: "Asha@Hand.test", name: "Asha", tenantId: TENANT })
    assert.equal(made.status, 200)
    const ticket = made.json.data.ticket
    assert.ok(ticket.length >= 40)
    const session = await redeem(ticket)
    assert.equal(session.status, 200)
    assert.deepEqual(session.json.data.user.roles, ["CANDIDATE"])
    assert.equal(session.json.data.user.mustChangePassword, false)
    assert.equal(session.json.data.user.tenantId, TENANT)
    assert.ok(session.json.data.accessToken)
    assert.match(session.cookie || "", /workmate_refresh=/)
    assert.equal((await redeem(ticket)).status, 401, "a ticket must work only once")
})

test("garbage, expired and unauthenticated attempts are refused", opts, async () => {
    assert.equal((await redeem("x".repeat(43))).status, 401)
    assert.equal((await redeem("short")).status, 401)
    const noKey = await ticketFor({ email: "z@hand.test", name: "Z", tenantId: TENANT }, { "Content-Type": "application/json" })
    assert.equal(noKey.status, 401)
    const made = await ticketFor({ email: "late@hand.test", name: "Late", tenantId: TENANT })
    const HandoffTicket = (await import("../models/handoffTicket.model.js")).default
    await HandoffTicket.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })
    assert.equal((await redeem(made.json.data.ticket)).status, 401)
})

test("anyone with another role, or another organization's account, is never given a ticket", opts, async () => {
    await User.create({ email: "boss@hand.test", emailNormalized: "boss@hand.test", displayName: "Boss", passwordHash: "x", roles: ["CLIENT_OWNER", "CANDIDATE"], tenantId: TENANT })
    const boss = await ticketFor({ email: "boss@hand.test", name: "Boss", tenantId: TENANT })
    assert.equal(boss.status, 409)
    await ticketFor({ email: "other@hand.test", name: "Other", tenantId: TENANT })
    const wrongOrg = await ticketFor({ email: "other@hand.test", name: "Other", tenantId: "507f1f77bcf86cd799439022" })
    assert.equal(wrongOrg.status, 409)
})
