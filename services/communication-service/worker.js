import "dotenv/config"
import mongoose from "mongoose"
import * as communicationRepo from "./repositories/communication.repository.js"
import { dispatchCommunication } from "./services/communication.service.js"
import { receiveNotifications, deleteNotification } from "./config/sqsClient.js"

// Standalone consumer for the notification-delivery queue (plan.md #7) -
// run as its own process/container, separate from the HTTP API, so a slow
// provider (SMTP/WhatsApp) never blocks a request thread. Stateless and
// idempotent: re-processing a message just re-sends and re-writes the same
// terminal status, which is safe because the API never enqueues the same
// communication twice.
const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/hirepro_communication"

const processMessage = async (message) => {
    const payload = JSON.parse(message.Body)
    const { communicationId, channel, recipient, finalSubject, finalBody, finalHtml, from, fromName } = payload

    const communication = await communicationRepo.findById(communicationId)
    if (!communication) {
        console.warn(`[communication-worker] communication ${communicationId} no longer exists, dropping job`)
        return
    }

    await dispatchCommunication(communication, { channel, recipient, finalSubject, finalBody, finalHtml, from, fromName })
}

const pollLoop = async () => {
    for (;;) {
        try {
            const { Messages } = await receiveNotifications()
            if (!Messages?.length) continue
            for (const message of Messages) {
                try {
                    await processMessage(message)
                } catch (err) {
                    console.error("[communication-worker] failed to process message:", err.message)
                    // Leave it in the queue - LocalStack/SQS redelivers after the
                    // visibility timeout, and eventually routes to the DLQ if it
                    // keeps failing, rather than silently dropping a notification.
                    continue
                }
                await deleteNotification(message.ReceiptHandle).catch((err) =>
                    console.error("[communication-worker] failed to delete processed message:", err.message)
                )
            }
        } catch (err) {
            console.error("[communication-worker] poll failed:", err.message)
        }
    }
}

await mongoose.connect(MONGODB_URL)
console.log("[communication-worker] connected to MongoDB, polling notification-delivery queue")
pollLoop()
