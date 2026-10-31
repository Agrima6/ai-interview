import crypto from "node:crypto"

// A short-lived link that lets a <video> element stream a recording with Range requests. The video element cannot send the
// Authorization header, and downloading the whole file as a blob first (what the page did before) made large recordings sit on
// "Loading..." for as long as the download took. The signature covers the organization, drive, round, candidate, capture and
// expiry, so a link works for exactly one recording of one organization and stops working after `ttlSeconds`.
const DEV_FALLBACK = "dev-only-file-url-secret"
const secret = () => {
    const value = process.env.FILE_URL_SECRET
    if (value) return value
    if (process.env.NODE_ENV === "production") throw new Error("FILE_URL_SECRET is not configured")
    return DEV_FALLBACK
}

const mac = ({ tenantId, driveId, roundNumber, candidateId, segment }, exp) =>
    crypto.createHmac("sha256", secret())
        .update(["recording", tenantId, driveId, roundNumber, candidateId, segment || "", exp].join("."))
        .digest("base64url")

export const signRecordingLink = (parts, ttlSeconds = 3 * 3600) => {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds
    return { exp, sig: mac(parts, exp) }
}

export const verifyRecordingLink = (parts, exp, sig) => {
    const expNum = Number(exp)
    if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000) || typeof sig !== "string") return false
    let expected
    try { expected = Buffer.from(mac(parts, expNum)) } catch { return false }
    const given = Buffer.from(sig)
    return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}
