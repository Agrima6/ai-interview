import crypto from "crypto"

// raw token -> URL/email/WhatsApp. SHA256(raw) -> database. The raw value is
// never persisted, logged, or returned to any caller after this point.
export const generateRawToken = () => crypto.randomBytes(32).toString("base64url")
export const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex")

export const invitationExpiry = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
