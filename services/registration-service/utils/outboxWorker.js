import Outbox from "../models/outbox.model.js"
import { publish } from "@workmateiq/common"

let workerInterval = null

export const startOutboxWorker = () => {
    const pollInterval = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || "2000", 10)
    console.log(`[registration-service] Outbox worker started with poll interval: ${pollInterval}ms`)

    workerInterval = setInterval(async () => {
        try {
            const events = await Outbox.find({ status: "PENDING" }).sort({ createdAt: 1 }).limit(10)
            for (const event of events) {
                try {
                    await publish(event.routingKey, event.payload, event.headers)
                    event.status = "PROCESSED"
                    event.processedAt = new Date()
                    await event.save()
                } catch (err) {
                    event.attempts += 1
                    event.error = err.message
                    if (event.attempts >= 5) {
                        event.status = "FAILED"
                    }
                    await event.save()
                    console.error(`[OutboxWorker] Failed to publish event ${event._id}:`, err.message)
                }
            }
        } catch (err) {
            console.error("[OutboxWorker] Error polling outbox:", err.message)
        }
    }, pollInterval)
}

export const stopOutboxWorker = () => {
    if (workerInterval) {
        clearInterval(workerInterval)
        workerInterval = null
        console.log("[registration-service] Outbox worker stopped")
    }
}
