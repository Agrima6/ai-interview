import test from "node:test"
import assert from "node:assert/strict"
process.env.CAPTCHA_SECRET = "test-secret"
delete process.env.TURNSTILE_SECRET_KEY
const { generateChallenge, verifyCaptcha } = await import("../utils/captcha.js")
const { validateAgainstFormVersion } = await import("../utils/formValidator.js")

const solve = (question) => { const [, a, b] = question.match(/(\d+) \+ (\d+)/); return Number(a) + Number(b) }

test("the challenge token does not reveal the answer", () => {
    const { challengeToken, question } = generateChallenge()
    const decoded = Buffer.from(challengeToken.split(".")[0], "base64url").toString()
    assert.ok(!/"a"|"b"/.test(decoded))
    assert.ok(!decoded.includes(String(solve(question)) + '"'))
})
test("a correct answer passes once and cannot be replayed", async () => {
    const c = generateChallenge()
    await verifyCaptcha({ captchaToken: c.challengeToken, captchaAnswer: solve(c.question) })
    await assert.rejects(verifyCaptcha({ captchaToken: c.challengeToken, captchaAnswer: solve(c.question) }), { code: "CAPTCHA_USED" })
})
test("a wrong answer fails and burns the challenge", async () => {
    const c = generateChallenge()
    await assert.rejects(verifyCaptcha({ captchaToken: c.challengeToken, captchaAnswer: solve(c.question) + 1 }), { code: "CAPTCHA_FAILED" })
    await assert.rejects(verifyCaptcha({ captchaToken: c.challengeToken, captchaAnswer: solve(c.question) }), { code: "CAPTCHA_USED" })
})
test("missing, tampered and forged tokens are rejected", async () => {
    await assert.rejects(verifyCaptcha({}), { code: "CAPTCHA_REQUIRED" })
    const c = generateChallenge()
    await assert.rejects(verifyCaptcha({ captchaToken: c.challengeToken + "x", captchaAnswer: 1 }), { code: "CAPTCHA_INVALID" })
})

const form = (fields) => ({ sections: [{ fields }] })
test("contact numbers are validated even when typed as text, and stored as 10 digits", () => {
    const f = form([{ key: "company_phone", label: "Company contact number", type: "TEXT", required: true }])
    const bad = { company_phone: "12345" }
    assert.equal(validateAgainstFormVersion(f, bad).length, 1)
    const good = { company_phone: "+91 98765-43210" }
    assert.equal(validateAgainstFormVersion(f, good).length, 0)
    assert.equal(good.company_phone, "9876543210")
})
