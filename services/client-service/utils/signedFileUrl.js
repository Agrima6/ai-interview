import crypto from "node:crypto"

// Short-lived, signed links to private onboarding files. An <img>/<iframe> cannot send an Authorization header, so
// the authenticated API hands out a link that carries its own proof (HMAC over file + expiry) instead of leaving
// the file endpoint open. The same FILE_URL_SECRET must be configured on every service that signs or verifies.
const DEV_FALLBACK = "dev-only-file-url-secret"

const secret = () => {
    const value = process.env.FILE_URL_SECRET
    if (value) return value
    if (process.env.NODE_ENV === "production") throw new Error("FILE_URL_SECRET is not configured")
    return DEV_FALLBACK
}

const mac = (onboardingId, fileId, exp) =>
    crypto.createHmac("sha256", secret()).update(`${onboardingId}.${fileId}.${exp}`).digest("base64url")

export const signedFilePath = (onboardingId, fileId, ttlSeconds = 3600) => {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds
    return `/api/v1/onboardings/${onboardingId}/files/${fileId}/view?exp=${exp}&sig=${mac(onboardingId, fileId, exp)}`
}

export const verifyFileSignature = (onboardingId, fileId, exp, sig) => {
    const expNum = Number(exp)
    if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000) || typeof sig !== "string") return false
    const expected = Buffer.from(mac(onboardingId, fileId, expNum))
    const given = Buffer.from(sig)
    return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}
