import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"

// Object storage for onboarding attachments (logos, verification docs) -
// points at local MinIO in dev/Docker; production swaps these env vars for
// real S3/creds without any code change.
const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "hirepro",
        secretAccessKey: process.env.S3_SECRET_KEY || "hirepro123",
    },
    forcePathStyle: true,
})

export const ONBOARDING_BUCKET = process.env.S3_BUCKET_ONBOARDING || "hirepro-onboarding"

export const uploadBuffer = async (key, buffer, contentType) => {
    await s3.send(new PutObjectCommand({ Bucket: ONBOARDING_BUCKET, Key: key, Body: buffer, ContentType: contentType }))
    return key
}

export const getObjectStream = async (key) => {
    const result = await s3.send(new GetObjectCommand({ Bucket: ONBOARDING_BUCKET, Key: key }))
    return { stream: result.Body, contentType: result.ContentType }
}

export default s3
