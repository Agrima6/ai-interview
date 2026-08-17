import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads")

// Stands in for S3 in local dev, per the spec's explicit allowance
// ("Local backend can use filesystem/MinIO. The React component stays the
// same."). Swapping this for a real S3 client later doesn't change the
// presign/complete API contract.
export const ensureDir = (onboardingId) => {
    const dir = path.join(UPLOAD_ROOT, onboardingId)
    fs.mkdirSync(dir, { recursive: true })
    return dir
}

export const filePathFor = (onboardingId, fileId, originalName) =>
    path.join(ensureDir(onboardingId), `${fileId}-${originalName}`)

export const writeFile = (onboardingId, fileId, originalName, buffer) => {
    const target = filePathFor(onboardingId, fileId, originalName)
    fs.writeFileSync(target, buffer)
    return target
}
