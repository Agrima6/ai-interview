import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import express from "express"
import jwt from "jsonwebtoken"

process.env.ACCESS_TOKEN_SECRET = "test-secret-for-voice-provider-tests"
const { agentServiceClient } = await import("../config/agentServiceClient.js")
const { default: router } = await import("../routes/adminSettings.routes.js")
const { errorHandler } = await import("../middlewares/requestContext.js")

const app = express()
app.use(express.json())
app.use("/api/v1", router)
app.use(errorHandler)
const server = http.createServer(app)
await new Promise((resolve) => server.listen(0, resolve))
const base = `http://127.0.0.1:${server.address().port}/api/v1/admin/settings/voice-provider`
test.after(() => server.close())

const token = (permissions, extra = {}) => jwt.sign({ sub: "u1", email: "root@example.com", roles: [], permissions, ...extra }, process.env.ACCESS_TOKEN_SECRET)
const SUPER = token(["SETTINGS_WRITE"])
const call = (method, body, bearer) => fetch(base, {
    method, headers: { "content-type": "application/json", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
})
const agentError = (status, message) => Object.assign(new Error(message), { status })

test("only an authenticated platform admin can read or change the setting", async () => {
    agentServiceClient.getVoiceProvider = async () => ({ provider: "sarvam" })
    assert.equal((await call("GET")).status, 401)
    assert.equal((await call("GET", null, "garbage")).status, 401)
    const orgAdmin = token(["CLIENT_SELF_READ", "CLIENT_SELF_UPDATE"])
    assert.equal((await call("GET", null, orgAdmin)).status, 403)
    assert.equal((await call("PUT", { provider: "sarvam" }, orgAdmin)).status, 403)
    assert.equal((await call("GET", null, SUPER)).status, 200)
})

test("the provider must be one of the two allowed values", async () => {
    let calls = 0
    agentServiceClient.setVoiceProvider = async () => { calls += 1; return {} }
    for (const bad of [undefined, "", "edge", "OPENAI", "sarvam,elevenlabs", 5, null]) {
        const res = await call("PUT", { provider: bad }, SUPER)
        assert.equal(res.status, 400, JSON.stringify(bad))
    }
    assert.equal(calls, 0, "an invalid value never reaches the voice service")
})

test("a valid change is forwarded with the actor from the signed token, not from the request body", async () => {
    let seen
    agentServiceClient.setVoiceProvider = async (provider, actor, expectedVersion) => { seen = { provider, actor, expectedVersion }; return { provider, message: "Voice provider updated successfully" } }
    const res = await call("PUT", { provider: " ElevenLabs ", expectedVersion: 3, actor: "someone-else@evil.com" }, SUPER)
    assert.equal(res.status, 200)
    assert.deepEqual(seen, { provider: "elevenlabs", actor: "root@example.com", expectedVersion: 3 })
    assert.equal((await res.json()).data.provider, "elevenlabs")
})

test("voice-service refusals reach the admin as clear, distinct errors", async () => {
    const cases = [[422, 422, "PROVIDER_NOT_CONFIGURED"], [409, 409, "SETTING_CONFLICT"], [400, 400, "INVALID_PROVIDER"], [500, 502, "VOICE_SERVICE_UNAVAILABLE"], [502, 502, "VOICE_SERVICE_UNAVAILABLE"]]
    for (const [agentStatus, status, code] of cases) {
        agentServiceClient.setVoiceProvider = async () => { throw agentError(agentStatus, "agent said no") }
        const res = await call("PUT", { provider: "sarvam" }, SUPER)
        assert.equal(res.status, status, String(agentStatus))
        assert.equal((await res.json()).error.code, code)
    }
})

test("an unreachable voice service is a 502 and never pretends the change happened", async () => {
    agentServiceClient.getVoiceProvider = async () => { throw agentError(undefined, "connect ECONNREFUSED") }
    const res = await call("GET", null, SUPER)
    assert.equal(res.status, 502)
})
