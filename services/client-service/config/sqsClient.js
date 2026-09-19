import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"

// Durable async job queue (plan.md #7/#8) - points at local LocalStack in
// dev/Docker; production swaps these env vars for real AWS SQS.
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY
const sessionToken = process.env.AWS_SESSION_TOKEN || undefined
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1"

if (!accessKeyId || !secretAccessKey) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("[client-service] FATAL: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be configured.")
    } else {
        console.warn("[client-service] WARNING: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are not set. SQS operations will be skipped until credentials are provided.")
    }
}

const customEndpoint = process.env.AWS_ENDPOINT_URL || process.env.SQS_ENDPOINT || undefined

const sqs = new SQSClient({
    region,
    ...(customEndpoint ? { endpoint: customEndpoint } : {}),
    ...(accessKeyId && secretAccessKey ? {
        credentials: {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken ? { sessionToken } : {}),
        },
    } : {}),
})

export const RECORDING_PROCESSING_QUEUE_URL =
    process.env.SQS_QUEUE_URL_RECORDING_PROCESSING ||
    process.env.SQS_QUEUE_URL ||
    process.env.RECORDING_PROCESSING_QUEUE_URL ||
    process.env.RECORDING_QUEUE_URL ||
    ""

// Best-effort: a candidate's recording is already durably stored in S3 by
// the time this is called, so a failed enqueue here should never fail the
// upload itself - it just means recording-processing runs later/manually.
export const enqueueRecordingProcessing = async (payload) => {
    if (!RECORDING_PROCESSING_QUEUE_URL) {
        return
    }
    try {
        const isFifo = RECORDING_PROCESSING_QUEUE_URL.endsWith(".fifo")
        const params = {
            QueueUrl: RECORDING_PROCESSING_QUEUE_URL,
            MessageBody: JSON.stringify(payload),
        }
        if (isFifo) {
            params.MessageGroupId = payload.candidateId || "recording"
            params.MessageDeduplicationId = `${payload.candidateId}-${Date.now()}`
        }
        await sqs.send(new SendMessageCommand(params))
    } catch (err) {
        console.error("[client-service] failed to enqueue recording-processing job:", err.message)
    }
}

export default sqs
