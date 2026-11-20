import crypto from "crypto"
import { ApiError } from "./response.js"

// Two modes behind one contract (verifyCaptcha throws, or the caller proceeds):
//
//  1. Cloudflare Turnstile - used whenever TURNSTILE_SECRET_KEY is set. The browser widget (site key) hands back a
//     token and it is verified HERE, server-side, with Cloudflare. Calling the registration API directly without a
//     valid token fails.
//  2. Built-in arithmetic challenge - the fallback when Turnstile is not configured. The answer is never put in the
//     token (it is an HMAC of nonce+answer, so it can't be read out of the response), each challenge works once,
//     and it expires.
const TTL_MS = 5 * 60 * 1000
const used = new Map()                       // nonce -> expiry, so a solved challenge cannot be replayed

const secret = () => process.env.CAPTCHA_SECRET || ""
const hmac = (text) => crypto.createHmac("sha256", secret()).update(text).digest("hex")
const safeEqual = (a, b) => {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b))
    return x.length === y.length && crypto.timingSafeEqual(x, y)
}
const sweep = () => { const now = Date.now(); for (const [nonce, exp] of used) if (exp < now) used.delete(nonce) }

export const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SITE_KEY)

export const generateChallenge = () => {
    if (turnstileEnabled()) return { provider: "turnstile", siteKey: process.env.TURNSTILE_SITE_KEY }
    if (!secret()) throw new ApiError(500, "CAPTCHA_UNAVAILABLE", "CAPTCHA is not configured.")
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    const nonce = crypto.randomBytes(12).toString("base64url")
    const encoded = Buffer.from(JSON.stringify({ nonce, exp: Date.now() + TTL_MS, h: hmac(`${nonce}:${a + b}`) })).toString("base64url")
    return { provider: "math", challengeToken: `${encoded}.${hmac(encoded)}`, question: `What is ${a} + ${b}?` }
}

const verifyTurnstile = async (token, remoteIp) => {
    if (!token) throw new ApiError(400, "CAPTCHA_REQUIRED", "Please complete the CAPTCHA.")
    let result
    try {
        const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: String(token) })
        if (remoteIp) body.set("remoteip", remoteIp)
        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) })
        result = await res.json()
    } catch {
        throw new ApiError(503, "CAPTCHA_UNAVAILABLE", "CAPTCHA could not be checked right now. Please try again.")
    }
    if (!result?.success) throw new ApiError(400, "CAPTCHA_FAILED", "CAPTCHA could not be verified. Please try again.")
}

const verifyMath = (challengeToken, answer) => {
    if (!challengeToken || answer === undefined || answer === null || answer === "") {
        throw new ApiError(400, "CAPTCHA_REQUIRED", "Please complete the CAPTCHA.")
    }
    const [encoded, signature] = String(challengeToken).split(".")
    if (!encoded || !signature || !safeEqual(hmac(encoded), signature)) {
        throw new ApiError(400, "CAPTCHA_INVALID", "CAPTCHA could not be verified.")
    }
    let payload
    try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) } catch { throw new ApiError(400, "CAPTCHA_INVALID", "CAPTCHA could not be verified.") }
    const { nonce, exp, h } = payload
    if (Date.now() > exp) throw new ApiError(400, "CAPTCHA_EXPIRED", "CAPTCHA expired, please get a new one.")
    sweep()
    if (used.has(nonce)) throw new ApiError(400, "CAPTCHA_USED", "This CAPTCHA was already used, please get a new one.")
    // A wrong answer burns the challenge too, so it cannot be brute-forced against one token.
    used.set(nonce, exp)
    if (!safeEqual(hmac(`${nonce}:${Number(answer)}`), h)) throw new ApiError(400, "CAPTCHA_FAILED", "CAPTCHA answer was incorrect.")
}

export const verifyCaptcha = async ({ captchaToken, captchaAnswer, turnstileToken } = {}, remoteIp) => {
    if (turnstileEnabled()) return verifyTurnstile(turnstileToken, remoteIp)
    return verifyMath(captchaToken, captchaAnswer)
}
