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
    dbPath = mkdtempSync(path.join(tmpdir(), "ann-test-"))
    let port
    for (let attempt = 0; attempt < 6; attempt++) {
        port = await freePort()
        mongo = spawn("mongod", ["--dbpath", dbPath, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket"], { stdio: "ignore" })
        let exited = false
        mongo.on("exit", () => { exited = true })
        await new Promise((r) => setTimeout(r, 500))
        if (!exited) break
    }
    process.env.MONGODB_URL = `mongodb://127.0.0.1:${port}/ann_test`
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

const call = async (method, url, { token, body } = {}) => {
    const res = await fetch(`${base}${url}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const json = (res.headers.get("content-type") || "").includes("json") ? await res.json() : await res.text()
    return { status: res.status, json, data: json?.data, error: json?.error }
}
const jwt = async (claims) => (await import("jsonwebtoken")).default.sign({ sub: "507f1f77bcf86cd799439011", email: "root@platform.test", ...claims }, process.env.ACCESS_TOKEN_SECRET)
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString()
const state = {}

test("set up: an organization and a college", opts, async () => {
    const { default: Client } = await import("../models/client.model.js")
    const oid = () => new mongoose.Types.ObjectId()
    state.org = oid(); state.college = oid()
    const base = (tenantId, name, type) => ({ onboardingId: oid(), registrationId: oid(), tenantId, type, name, status: "ACTIVE", primaryContact: { name: "Owner", email: `o@${name.split(" ")[0].toLowerCase()}.test`, phone: "9876543210" } })
    await Client.create([base(state.org, "Acme Corp", "ORGANIZATION"), base(state.college, "Delhi College", "COLLEGE")])
    state.root = await jwt({ permissions: ["SETTINGS_WRITE"] })
    state.orgToken = await jwt({ tenantId: String(state.org), permissions: ["CLIENT_SELF_READ"] })
    state.collegeToken = await jwt({ tenantId: String(state.college), permissions: ["CLIENT_SELF_READ"] })
})

test("only the platform owner can write announcements", opts, async () => {
    const body = { message: "We launched a new service", endsAt: inDays(2) }
    assert.equal((await call("POST", "/admin/announcements", { body })).status, 401)
    assert.equal((await call("POST", "/admin/announcements", { token: state.orgToken, body })).status, 403)
    assert.equal((await call("GET", "/admin/announcements", { token: state.orgToken })).status, 403)
    assert.equal((await call("POST", "/admin/announcements", { token: state.orgToken, body })).status, 403)
})

test("validation: a message, a real end in the future, a safe link, a sane length", opts, async () => {
    const post = (body) => call("POST", "/admin/announcements", { token: state.root, body })
    assert.equal((await post({ message: "ab", endsAt: inDays(1) })).status, 400)
    assert.equal((await post({ message: "x".repeat(281), endsAt: inDays(1) })).status, 400)
    assert.equal((await post({ message: "Fine message" })).error.fields.endsAt.includes("not a valid"), true)
    assert.equal((await post({ message: "Fine message", endsAt: inDays(-1) })).status, 400)                              // already over
    assert.equal((await post({ message: "Fine message", startsAt: inDays(3), endsAt: inDays(2) })).status, 400)          // ends before it starts
    assert.equal((await post({ message: "Fine message", endsAt: inDays(400) })).status, 400)                              // longer than a year
    assert.equal((await post({ message: "Fine message", endsAt: inDays(1), linkUrl: "javascript:alert(1)", linkLabel: "Go" })).status, 400)
    assert.equal((await post({ message: "Fine message", endsAt: inDays(1), linkUrl: "not a url" })).status, 400)
    assert.equal((await post({ message: "Fine message", endsAt: inDays(1), audience: "EVERYONE" })).status, 400)
    assert.equal((await post({ message: "Fine message", endsAt: inDays(1), linkLabel: "Go" })).status, 400)               // a label with nothing to open
})

test("a live announcement reaches the organizations it is meant for, and only while it runs", opts, async () => {
    const live = (token) => call("GET", "/organization/announcements", { token })
    assert.equal((await live(state.orgToken)).data.length, 0)

    const all = await call("POST", "/admin/announcements", { token: state.root, body: { message: "  We launched   WorkmateIQ Reports!  ", endsAt: inDays(2), tone: "SUCCESS", linkUrl: "https://workmateiq.com/reports", linkLabel: "See it" } })
    assert.equal(all.status, 200); assert.equal(all.data.state, "LIVE"); assert.equal(all.data.message, "We launched WorkmateIQ Reports!")
    const onlyColleges = await call("POST", "/admin/announcements", { token: state.root, body: { message: "Campus season tips", endsAt: inDays(1), audience: "COLLEGE" } })
    const later = await call("POST", "/admin/announcements", { token: state.root, body: { message: "Starts next week", startsAt: inDays(7), endsAt: inDays(8) } })
    assert.equal(later.data.state, "SCHEDULED")

    const org = (await live(state.orgToken)).data
    assert.deepEqual(org.map((a) => a.message), ["We launched WorkmateIQ Reports!"])        // not the college one, not the scheduled one
    assert.equal(org[0].linkUrl, "https://workmateiq.com/reports"); assert.equal(org[0].tone, "SUCCESS")
    assert.deepEqual((await live(state.collegeToken)).data.map((a) => a.message).sort(), ["Campus season tips", "We launched WorkmateIQ Reports!"])
    assert.equal((await call("GET", "/organization/announcements")).status, 401)

    // ending one early removes it at once, and it stays in the list as history
    await call("POST", `/admin/announcements/${onlyColleges.data.id}/stop`, { token: state.root })
    assert.deepEqual((await live(state.collegeToken)).data.map((a) => a.message), ["We launched WorkmateIQ Reports!"])
    const states = Object.fromEntries((await call("GET", "/admin/announcements", { token: state.root })).data.map((a) => [a.message, a.state]))
    assert.equal(states["Campus season tips"], "STOPPED"); assert.equal(states["Starts next week"], "SCHEDULED"); assert.equal(states["We launched WorkmateIQ Reports!"], "LIVE")
    assert.equal((await call("GET", "/admin/announcements?state=live", { token: state.root })).data.length, 1)
    assert.equal((await call("GET", "/admin/announcements?state=past", { token: state.root })).data.length, 1)

    // one that has run out is gone without anyone doing anything
    const { default: Announcement } = await import("../models/announcement.model.js")
    await Announcement.updateOne({ _id: all.data.id }, { $set: { endsAt: new Date(Date.now() - 1000) } })
    assert.equal((await live(state.orgToken)).data.length, 0)

    // edit (extend) brings it back; delete removes it for good
    const back = await call("PATCH", `/admin/announcements/${all.data.id}`, { token: state.root, body: { endsAt: inDays(3), message: "We launched Reports v2" } })
    assert.equal(back.data.state, "LIVE")
    assert.deepEqual((await live(state.orgToken)).data.map((a) => a.message), ["We launched Reports v2"])
    assert.equal((await call("DELETE", `/admin/announcements/${all.data.id}`, { token: state.root })).data.deleted, true)
    assert.equal((await live(state.orgToken)).data.length, 0)
    assert.equal((await call("DELETE", `/admin/announcements/${all.data.id}`, { token: state.root })).status, 404)
    assert.equal((await call("POST", "/admin/announcements/not-an-id/stop", { token: state.root })).status, 404)
})
