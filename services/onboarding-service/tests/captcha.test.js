import test from "node:test"
import assert from "node:assert/strict"
process.env.CAPTCHA_SECRET = "test-secret"
delete process.env.TURNSTILE_SECRET_KEY
const { generateChallenge, verifyCaptcha } = await import("../utils/captcha.js")

const solve = (question) => { const [, a, b] = question.match(/(\d+) \+ (\d+)/); return Number(a) + Number(b) }

// A challenge issued by the registration service (same secret, same format) must be accepted here, because the onboarding page
// shows the registration service's challenge.
test("a correct answer to a challenge is accepted once and cannot be replayed", async () => {
    const c = generateChallenge()
    await verifyCaptcha({ captchaToken: c.challengeToken, captchaAnswer: solve(c.question) })
    await assert.rejects(verifyCaptcha({ captchaToken: c.challengeToken, captchaAnswer: solve(c.question) }), { code: "CAPTCHA_USED" })
})
test("a wrong answer fails, and missing or tampered tokens are rejected", async () => {
    const c = generateChallenge()
    await assert.rejects(verifyCaptcha({ captchaToken: c.challengeToken, captchaAnswer: solve(c.question) + 1 }), { code: "CAPTCHA_FAILED" })
    await assert.rejects(verifyCaptcha({}), { code: "CAPTCHA_REQUIRED" })
    await assert.rejects(verifyCaptcha({ captchaToken: generateChallenge().challengeToken + "x", captchaAnswer: 1 }), { code: "CAPTCHA_INVALID" })
})
test("the old answer-in-the-token format is no longer trusted", async () => {
    const encoded = Buffer.from(JSON.stringify({ a: 3, b: 4, exp: Date.now() + 60000 })).toString("base64url")
    const { createHmac } = await import("node:crypto")
    const token = `${encoded}.${createHmac("sha256", "test-secret").update(encoded).digest("hex")}`
    await assert.rejects(verifyCaptcha({ captchaToken: token, captchaAnswer: 7 }), { code: "CAPTCHA_FAILED" })
})
