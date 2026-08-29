import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads")

let s3Client = null

export const initStorage = () => {
    const provider = process.env.STORAGE_PROVIDER || "local"
    if (provider === "s3") {
        const region = process.env.AWS_REGION
        const bucket = process.env.AWS_S3_BUCKET
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

        if (!region || !bucket || !accessKeyId || !secretAccessKey) {
            console.error(`[onboarding-service] STORAGE_PROVIDER=s3 but S3 credentials/bucket details are missing!`)
            process.exit(1)
        }

        s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            }
        })
        console.log(`[onboarding-service] S3 Storage initialized with bucket: ${bucket}`)
    } else {
        console.log(`[onboarding-service] Local Storage initialized at: ${UPLOAD_ROOT}`)
    }
}

export const getUploadDetails = async (onboardingId, fileId, originalName, mimeType) => {
    const provider = process.env.STORAGE_PROVIDER || "local"
    const objectKey = `onboarding/${onboardingId}/${fileId}-${originalName}`

    if (provider === "s3") {
        const bucket = process.env.AWS_S3_BUCKET
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            ContentType: mimeType,
        })
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
        return {
            uploadUrl,
            method: "PUT",
            storageProvider: "s3",
            bucket,
            objectKey,
        }
    } else {
        return {
            uploadUrl: `/api/v1/onboardings/${onboardingId}/files/upload`,
            method: "POST",
            storageProvider: "local",
            objectKey,
        }
    }
}

export const getDownloadUrl = async (onboardingId, fileId, originalName) => {
    const provider = process.env.STORAGE_PROVIDER || "local"
    const objectKey = `onboarding/${onboardingId}/${fileId}-${originalName}`

    if (provider === "s3") {
        const bucket = process.env.AWS_S3_BUCKET
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: objectKey,
        })
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    } else {
        return `/api/v1/onboardings/${onboardingId}/files/${fileId}/view`
    }
}

export const deleteFile = async (onboardingId, fileId, originalName) => {
    const provider = process.env.STORAGE_PROVIDER || "local"
    const objectKey = `onboarding/${onboardingId}/${fileId}-${originalName}`

    if (provider === "s3") {
        const bucket = process.env.AWS_S3_BUCKET
        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: objectKey,
        })
        await s3Client.send(command)
    } else {
        const localPath = path.join(UPLOAD_ROOT, onboardingId, `${fileId}-${originalName}`)
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath)
        }
    }
}

const ensureLocalDir = (onboardingId) => {
    const dir = path.join(UPLOAD_ROOT, onboardingId)
    fs.mkdirSync(dir, { recursive: true })
    return dir
}

export const writeLocalFile = (onboardingId, fileId, originalName, buffer) => {
    ensureLocalDir(onboardingId)
    const target = path.join(UPLOAD_ROOT, onboardingId, `${fileId}-${originalName}`)
    fs.writeFileSync(target, buffer)
    return target
}

export const getLocalFilePath = (onboardingId, fileId, originalName) => {
    return path.join(UPLOAD_ROOT, onboardingId, `${fileId}-${originalName}`)
}
