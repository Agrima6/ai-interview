import "dotenv/config"
import app from "./app.js"
import connectDb from "./config/connectDb.js"
import { initRedis } from "@workmateiq/common"
import { initQueue, startConsumers } from "@workmateiq/common"
import { setupGracefulShutdown } from "@workmateiq/common"
import { initSubscriptions } from "./subscribers/clientCreated.js"

const PORT = process.env.PORT || 4001

const boot = async () => {
    await connectDb()
    await initRedis()
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
