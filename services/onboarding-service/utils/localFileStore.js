import path from "path"
import { uploadBuffer } from "../config/s3Client.js"

// Object storage (S3/MinIO), not the app server's local disk (plan.md #11)
// - the "key" is the S3 object key with sanitized extension, avoiding
// path traversal or malformed object keys from untrusted originalName.
export const keyFor = (onboardingId, fileId, originalName = "") => {
    const rawExt = path.extname(originalName || "").toLowerCase()
    const safeExt = /^\.[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : ""
    return `${onboardingId}/${fileId}${safeExt}`
}

export const writeFile = async (onboardingId, fileId, originalName, buffer, mimeType) => {
    const key = keyFor(onboardingId, fileId, originalName)
    await uploadBuffer(key, buffer, mimeType)
    return key
}
