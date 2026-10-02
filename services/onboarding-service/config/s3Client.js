import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"

// Object storage for onboarding attachments (logos, verification docs) -
// points at local MinIO in dev/Docker; production swaps these env vars for
// real S3/creds without any code change.
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY
const sessionToken = process.env.AWS_SESSION_TOKEN || undefined
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || process.env.S3_REGION || "us-east-1"

if (!accessKeyId || !secretAccessKey) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("[onboarding-service] FATAL: AWS_ACCESS_KEY_ID (or S3_ACCESS_KEY) and AWS_SECRET_ACCESS_KEY (or S3_SECRET_KEY) must be configured.")
    } else {
        console.warn("[onboarding-service] WARNING: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are not set. S3 operations will fail until credentials are provided.")
    }
}

const customEndpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL || undefined
const forcePathStyle = Boolean(
    process.env.S3_FORCE_PATH_STYLE === "true" ||
    (customEndpoint && !customEndpoint.includes("amazonaws.com"))
)

const s3Config = {
    region,
    ...(customEndpoint ? { endpoint: customEndpoint, forcePathStyle } : {}),
    ...(accessKeyId && secretAccessKey ? {
        credentials: {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken ? { sessionToken } : {}),
        },
    } : {}),
}

const s3 = new S3Client(s3Config)

export const S3_BUCKET_NAME =
    process.env.S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET ||
    process.env.S3_BUCKET ||
    "ai-interview-storage"

export const S3_BUCKET = S3_BUCKET_NAME
export const ONBOARDING_BUCKET = process.env.S3_BUCKET_ONBOARDING || S3_BUCKET_NAME

export const uploadBuffer = async (key, buffer, contentType) => {
    await s3.send(new PutObjectCommand({ Bucket: ONBOARDING_BUCKET, Key: key, Body: buffer, ContentType: contentType }))
    return key
}

export const getObjectStream = async (key) => {
    const result = await s3.send(new GetObjectCommand({ Bucket: ONBOARDING_BUCKET, Key: key }))
    return { stream: result.Body, contentType: result.ContentType }
}

export default s3
