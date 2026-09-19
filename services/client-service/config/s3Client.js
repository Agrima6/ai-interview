import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"

// Object storage for candidate resumes/recordings (plan.md #11: "Store
// recordings in object storage, not MongoDB/local disk"). Points at local
// MinIO in dev/Docker; production swaps these env vars for real S3/creds
// without any code change.
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY
const sessionToken = process.env.AWS_SESSION_TOKEN || undefined
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || process.env.S3_REGION || "us-east-1"

if (!accessKeyId || !secretAccessKey) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("[client-service] FATAL: AWS_ACCESS_KEY_ID (or S3_ACCESS_KEY) and AWS_SECRET_ACCESS_KEY (or S3_SECRET_KEY) must be configured.")
    } else {
        console.warn("[client-service] WARNING: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are not set. S3 operations will fail until credentials are provided.")
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
export const RESUMES_BUCKET = process.env.S3_BUCKET_RESUMES || S3_BUCKET_NAME
export const RECORDINGS_BUCKET = process.env.S3_BUCKET_RECORDINGS || S3_BUCKET_NAME
export const PROCTOR_BUCKET = process.env.S3_BUCKET_PROCTOR || S3_BUCKET_NAME

export const uploadBuffer = async (bucket, key, buffer, contentType) => {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }))
    return key
}

export const getObjectBuffer = async (bucket, key) => {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const chunks = []
    for await (const chunk of result.Body) chunks.push(chunk)
    return Buffer.concat(chunks)
}

export const getObjectStream = async (bucket, key, range = undefined) => {
    const params = { Bucket: bucket, Key: key }
    if (range) params.Range = range
    const result = await s3.send(new GetObjectCommand(params))
    return {
        stream: result.Body,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        contentRange: result.ContentRange,
        acceptRanges: result.AcceptRanges,
    }
}

export const objectExists = async (bucket, key) => {
    try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
        return true
    } catch {
        return false
    }
}

export default s3
