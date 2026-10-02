import crypto from "crypto"

// AES-256-GCM at-rest encryption for SMTP passwords (and any other secret
// a tenant hands us to store on their behalf) - integration.md section 27:
// "Store secrets securely on the backend", never in plaintext.
//
// SMTP_ENCRYPTION_KEY must be a 32-byte key, given as a 64-char hex string.
// Falls back to a fixed dev-only key so local development doesn't need
// extra .env setup, but warns loudly since that key must never be used
// for real credentials.
const KEY = (() => {
    const raw = process.env.SMTP_ENCRYPTION_KEY
    if (raw && /^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex")
    console.warn("[client-service] SMTP_ENCRYPTION_KEY is not set (or not 64 hex chars) - using an insecure dev-only key. Set a real key before storing production SMTP credentials.")
    return crypto.createHash("sha256").update("interviewiq-dev-only-smtp-key").digest()
})()

const IV_LENGTH = 12 // recommended IV size for GCM

export const encryptSecret = (plaintext) => {
    if (!plaintext) return null
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv)
    const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, ciphertext]).toString("base64")
}

export const decryptSecret = (encoded) => {
    if (!encoded) return null
    const raw = Buffer.from(encoded, "base64")
    const iv = raw.subarray(0, IV_LENGTH)
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16)
    const ciphertext = raw.subarray(IV_LENGTH + 16)
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}
