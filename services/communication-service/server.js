import "dotenv/config"
import app from "./app.js"
import connectDb from "./config/connectDb.js"
import { initQueue, startConsumers } from "@workmateiq/common"
import { setupGracefulShutdown } from "@workmateiq/common"
import { initSubscriptions } from "./subscribers/notificationRequested.js"

const PORT = process.env.PORT || 4005

const boot = async () => {
    await connectDb()
    await initQueue()
    initSubscriptions()
    await startConsumers()

    const server = app.listen(PORT, () => {
        console.log(`[${process.env.SERVICE_NAME}] listening on ${PORT}`)
    })

    setupGracefulShutdown(server)
}

boot().catch(err => {
    console.error("Boot failed:", err)
    process.exit(1)
})
