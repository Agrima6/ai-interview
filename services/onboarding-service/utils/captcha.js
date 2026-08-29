import crypto from "crypto"
import { ApiError } from "./response.js"

const sign = (payload) => crypto.createHmac("sha256", process.env.CAPTCHA_SECRET).update(payload).digest("hex")

export const verifyCaptcha = (challengeToken, answer) => {
    if (!challengeToken || answer === undefined || answer === null || answer === "") {
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
