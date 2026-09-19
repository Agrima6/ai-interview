import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"

// Durable async job queue (plan.md #7/#8) - points at local LocalStack in
// dev/Docker; production swaps these env vars for real AWS SQS.
const sqs = new SQSClient({
    endpoint: process.env.AWS_ENDPOINT_URL || "http://localhost:4566",
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    },
})

const RECORDING_PROCESSING_QUEUE_URL =
    process.env.SQS_QUEUE_URL_RECORDING_PROCESSING ||
    "http://localhost:4566/000000000000/recording-processing"

// Best-effort: a candidate's recording is already durably stored in S3 by
// the time this is called, so a failed enqueue here should never fail the
// upload itself - it just means recording-processing runs later/manually.
export const enqueueRecordingProcessing = async (payload) => {
    try {
        await sqs.send(new SendMessageCommand({
            QueueUrl: RECORDING_PROCESSING_QUEUE_URL,
            MessageBody: JSON.stringify(payload),
        }))
    } catch (err) {
        console.error("[client-service] failed to enqueue recording-processing job:", err.message)
    }
}

export default sqs
