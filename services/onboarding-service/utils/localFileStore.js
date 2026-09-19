import { uploadBuffer } from "../config/s3Client.js"

// Object storage (S3/MinIO), not the app server's local disk (plan.md #11)
// - the "key" is the S3 object key, kept the same shape as the previous
// local-path helper so callers didn't need to change.
export const keyFor = (onboardingId, fileId, originalName) => `${onboardingId}/${fileId}-${originalName}`

export const writeFile = async (onboardingId, fileId, originalName, buffer, mimeType) => {
    const key = keyFor(onboardingId, fileId, originalName)
    await uploadBuffer(key, buffer, mimeType)
    return key
}
