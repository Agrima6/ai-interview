import crypto from "node:crypto"

// A recorded video answer is private. A <video> tag cannot send an Authorization header, so the organizer's API hands
// out a short-lived link that proves itself (HMAC over attempt + question + expiry). Derived from the OA token secret,
// so no extra configuration is needed.
const secret = () => {
    const base = process.env.OA_TOKEN_SECRET || (process.env.ACCESS_TOKEN_SECRET ? `${process.env.ACCESS_TOKEN_SECRET}#oa` : "")
    if (base) return `${base}#video`
    if (process.env.NODE_ENV === "production") throw new Error("OA_TOKEN_SECRET is not configured")
    return "dev-only-oa-video-secret"
}

const mac = (attemptId, questionId, exp) => crypto.createHmac("sha256", secret()).update(`${attemptId}.${questionId}.${exp}`).digest("base64url")

export const VIDEO_MIME_TYPES = Object.freeze(["video/webm", "video/mp4"])
/**
 * What a recording really is, from its first bytes rather than the label the browser put on it (recent Chrome labels
 * recordings with container types a list of names would miss). WebM and Matroska start with 1A 45 DF A3; MP4 and
 * QuickTime have "ftyp" at byte 4. Anything else is not a video we can play back.
 */
export const sniffVideoType = (buffer) => {
    if (!buffer || buffer.length < 12) return null
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "video/webm"
    if (buffer.subarray(4, 8).toString("latin1") === "ftyp") return "video/mp4"
    return null
}

export const VIDEO_MAX_BYTES = 80 * 1024 * 1024

export const videoObjectKey = ({ assessmentId, attemptId, questionId, mime }) =>
    `oa-video/${assessmentId}/${attemptId}/${questionId}-${Date.now()}.${mime === "video/mp4" ? "mp4" : "webm"}`

export const signedVideoPath = (attemptId, questionId, ttlSeconds = 2 * 3600) => {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds
    return `/api/v1/oa/video/${attemptId}/${questionId}?exp=${exp}&sig=${mac(attemptId, questionId, exp)}`
}

export const verifyVideoSignature = (attemptId, questionId, exp, sig) => {
    const expNum = Number(exp)
    if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000) || typeof sig !== "string") return false
    let expected
    try { expected = Buffer.from(mac(attemptId, questionId, expNum)) } catch { return false }
    const given = Buffer.from(sig)
    return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}
