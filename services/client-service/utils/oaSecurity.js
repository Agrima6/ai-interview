import crypto from "crypto"
import jwt from "jsonwebtoken"
import { ApiError } from "./response.js"

// The Online Assessment room has its own identities (OA admins, exam students), kept apart from the platform's
// user accounts so the same email can exist as an organization admin, a college admin, a candidate and an OA
// admin at once. Its tokens use their own secret and audience, so a platform token is never accepted here and an
// OA token is never accepted by the platform.

const secret = () => process.env.OA_TOKEN_SECRET || `${process.env.ACCESS_TOKEN_SECRET || "dev-only"}#oa`

export const OA_ROLES = Object.freeze({ ADMIN: "OA_ADMIN", STUDENT: "OA_STUDENT" })

export const signOaToken = (claims, expiresInSeconds) =>
    jwt.sign({ ...claims, typ: "oa" }, secret(), { algorithm: "HS256", audience: "oa", expiresIn: expiresInSeconds })

export const verifyOaToken = (token) => jwt.verify(token, secret(), { algorithms: ["HS256"], audience: "oa" })

export const requireOa = (role) => (req, res, next) => {
    const header = req.headers.authorization || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) return next(new ApiError(401, "UNAUTHENTICATED", "Please sign in."))
    try {
        const claims = verifyOaToken(token)
        if (claims.role !== role) return next(new ApiError(403, "FORBIDDEN", "This account cannot do that."))
        req.oa = claims
        next()
    } catch {
        next(new ApiError(401, "TOKEN_EXPIRED", "Your session has expired. Please sign in again."))
    }
}

// ---- passwords (scrypt, no extra dependency) ----
const KEY_LEN = 64

export const hashPassword = (password) => {
    const salt = crypto.randomBytes(16)
    const hash = crypto.scryptSync(String(password), salt, KEY_LEN)
    return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
}

export const verifyPassword = (password, stored) => {
    const [scheme, saltHex, hashHex] = String(stored || "").split("$")
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false
    const expected = Buffer.from(hashHex, "hex")
    const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, "hex"), expected.length)
    return crypto.timingSafeEqual(actual, expected)
}

// 8+ chars with a letter and a digit - enough to stop trivial passwords without fighting the user.
export const passwordProblem = (password) => {
    const value = String(password || "")
    if (value.length < 8) return "Use at least 8 characters."
    if (value.length > 128) return "Use at most 128 characters."
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number."
    return null
}

// ---- exam access codes ----
// No 0/O/1/I/L so a code read off an email or a phone is hard to mistype.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export const generateAccessCode = (length = 8) => {
    let code = ""
    for (const byte of crypto.randomBytes(length)) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
    return code
}

export const normalizeAccessCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "")

export const hashAccessCode = (code) => crypto.createHash("sha256").update(normalizeAccessCode(code)).digest("hex")

export const codesMatch = (code, storedHash) => {
    const a = Buffer.from(hashAccessCode(code), "hex")
    const b = Buffer.from(String(storedHash || ""), "hex")
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase()
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// ---- tiny in-memory limiter for the sign-in endpoints (per process; a shared store is the next step if scaled out) ----
const buckets = new Map()

export const rateLimit = ({ key, max, windowMs }) => {
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return
    }
    bucket.count += 1
    if (bucket.count > max) {
        throw new ApiError(429, "TOO_MANY_ATTEMPTS", `Too many attempts. Try again in ${Math.ceil((bucket.resetAt - now) / 60000)} minute(s).`)
    }
}

export const clearRateLimit = (key) => buckets.delete(key)

// Keeps the map from growing without bound on a long-lived process.
setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key)
}, 10 * 60 * 1000).unref()
