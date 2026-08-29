import "dotenv/config"
import app from "./app.js"
import connectDb from "./config/connectDb.js"
import { initRedis } from "@workmateiq/common"
import { initQueue, startConsumers } from "@workmateiq/common"
import { initStorage } from "./utils/storage.js"
import { setupGracefulShutdown } from "@workmateiq/common"
import { startOutboxWorker, stopOutboxWorker } from "./utils/outboxWorker.js"
import { registerCleanupTask } from "@workmateiq/common"
import { initSubscriptions } from "./subscribers/registrationSubmitted.js"

const PORT = process.env.PORT || 4004

const boot = async () => {
    await connectDb()
    await initRedis()
    await initQueue()
    initStorage()
    initSubscriptions()
    await startConsumers()
    registerCleanupTask(stopOutboxWorker)
    startOutboxWorker()

    const server = app.listen(PORT, () => {
        console.log(`[${process.env.SERVICE_NAME}] listening on ${PORT}`)
    })

    setupGracefulShutdown(server)
}

boot().catch(err => {
    console.error("Boot failed:", err)
    process.exit(1)
})
