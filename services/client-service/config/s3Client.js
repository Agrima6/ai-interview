import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"

// Object storage for candidate resumes/recordings (plan.md #11: "Store
// recordings in object storage, not MongoDB/local disk"). Points at local
// MinIO in dev/Docker; production swaps these env vars for real S3/creds
// without any code change.
const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "hirepro",
        secretAccessKey: process.env.S3_SECRET_KEY || "hirepro123",
    },
    forcePathStyle: true, // required for MinIO (and most S3-compatible stores)
})

export const RESUMES_BUCKET = process.env.S3_BUCKET_RESUMES || "hirepro-resumes"
export const RECORDINGS_BUCKET = process.env.S3_BUCKET_RECORDINGS || "hirepro-recordings"

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

export const getObjectStream = async (bucket, key) => {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    return { stream: result.Body, contentType: result.ContentType, contentLength: result.ContentLength }
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
