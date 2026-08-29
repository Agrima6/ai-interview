import "dotenv/config"
import app from "./app.js"
import connectDb from "./config/connectDb.js"
import { initRedis } from "@workmateiq/common"
import { setupGracefulShutdown } from "@workmateiq/common"

const PORT = process.env.PORT || 4002

const boot = async () => {
    await connectDb()
    await initRedis()

    const server = app.listen(PORT, () => {
        console.log(`[${process.env.SERVICE_NAME}] listening on ${PORT}`)
    })

    setupGracefulShutdown(server)
}

boot().catch(err => {
    console.error("Boot failed:", err)
    process.exit(1)
})
