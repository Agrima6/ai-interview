import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs"

// Durable async job queue (plan.md #7) - points at local LocalStack in
// dev/Docker; production swaps these env vars for real AWS SQS.
const sqs = new SQSClient({
    endpoint: process.env.AWS_ENDPOINT_URL || "http://localhost:4566",
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    },
})

export const NOTIFICATION_QUEUE_URL =
    process.env.SQS_QUEUE_URL_NOTIFICATION_DELIVERY ||
    "http://localhost:4566/000000000000/notification-delivery"

export const enqueueNotification = (payload) =>
    sqs.send(new SendMessageCommand({ QueueUrl: NOTIFICATION_QUEUE_URL, MessageBody: JSON.stringify(payload) }))

export const receiveNotifications = (maxMessages = 5, waitTimeSeconds = 10) =>
    sqs.send(new ReceiveMessageCommand({
        QueueUrl: NOTIFICATION_QUEUE_URL,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        VisibilityTimeout: 30,
    }))

export const deleteNotification = (receiptHandle) =>
    sqs.send(new DeleteMessageCommand({ QueueUrl: NOTIFICATION_QUEUE_URL, ReceiptHandle: receiptHandle }))

export default sqs
