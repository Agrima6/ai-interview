import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs"

// Durable async job queue (plan.md #7) - points at local LocalStack in
// dev/Docker; production swaps these env vars for real AWS SQS.
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY
const sessionToken = process.env.AWS_SESSION_TOKEN || undefined
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1"

if (!accessKeyId || !secretAccessKey) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("[communication-service] FATAL: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be configured.")
    } else {
        console.warn("[communication-service] WARNING: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are not set. SQS operations will fail until credentials are provided.")
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

export const NOTIFICATION_QUEUE_URL =
    process.env.SQS_QUEUE_URL ||
    process.env.NOTIFICATION_QUEUE_URL ||
    process.env.SQS_QUEUE_URL_NOTIFICATION_DELIVERY ||
    process.env.AWS_SQS_QUEUE_URL ||
    process.env.NOTIFICATION_DELIVERY_QUEUE_URL ||
    ""

export const enqueueNotification = (payload) => {
    if (!NOTIFICATION_QUEUE_URL) {
        throw new Error("[communication-service] SQS_QUEUE_URL / NOTIFICATION_QUEUE_URL is not configured.")
    }
    const isFifo = NOTIFICATION_QUEUE_URL.endsWith(".fifo")
    const params = {
        QueueUrl: NOTIFICATION_QUEUE_URL,
        MessageBody: JSON.stringify(payload),
    }
    if (isFifo) {
        params.MessageGroupId = payload.channel || "notification"
        params.MessageDeduplicationId = payload.communicationId || String(Date.now())
    }
    return sqs.send(new SendMessageCommand(params))
}

export const receiveNotifications = (maxMessages = 5, waitTimeSeconds = 10) => {
    if (!NOTIFICATION_QUEUE_URL) {
        throw new Error("[communication-service] SQS_QUEUE_URL / NOTIFICATION_QUEUE_URL is not configured.")
    }
    return sqs.send(new ReceiveMessageCommand({
        QueueUrl: NOTIFICATION_QUEUE_URL,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        VisibilityTimeout: 30,
    }))
}

export const deleteNotification = (receiptHandle) => {
    if (!NOTIFICATION_QUEUE_URL) {
        throw new Error("[communication-service] SQS_QUEUE_URL / NOTIFICATION_QUEUE_URL is not configured.")
    }
    return sqs.send(new DeleteMessageCommand({ QueueUrl: NOTIFICATION_QUEUE_URL, ReceiptHandle: receiptHandle }))
}

export default sqs
