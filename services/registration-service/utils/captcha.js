import crypto from "crypto"
import { ApiError } from "@workmateiq/common"

// A minimal, self-hosted, stateless CAPTCHA: no external provider
// credentials exist in this environment, so this stands in behind the same
// "captchaToken passes verification" contract a real reCAPTCHA/hCaptcha
// integration would fulfill. Swappable later without touching callers.
const TTL_MS = 5 * 60 * 1000

const sign = (payload) => crypto.createHmac("sha256", process.env.CAPTCHA_SECRET).update(payload).digest("hex")

export const generateChallenge = () => {
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    const payload = JSON.stringify({ a, b, exp: Date.now() + TTL_MS })
    const encoded = Buffer.from(payload).toString("base64url")
    const challengeToken = `${encoded}.${sign(encoded)}`
    return { challengeToken, question: `What is ${a} + ${b}?` }
}

export const verifyCaptcha = (challengeToken, answer) => {
    if (!challengeToken || answer === undefined || answer === null) {
        throw new ApiError(400, "CAPTCHA_REQUIRED", "Please complete the CAPTCHA.")
    }
    const [encoded, signature] = String(challengeToken).split(".")
    if (!encoded || !signature || sign(encoded) !== signature) {
        throw new ApiError(400, "CAPTCHA_INVALID", "CAPTCHA could not be verified.")
    }
    const { a, b, exp } = JSON.parse(Buffer.from(encoded, "base64url").toString())
    if (Date.now() > exp) throw new ApiError(400, "CAPTCHA_EXPIRED", "CAPTCHA expired, please try again.")
    if (Number(answer) !== a + b) throw new ApiError(400, "CAPTCHA_FAILED", "CAPTCHA answer was incorrect.")
}
