import "dotenv/config"
import app from "./app.js"
import { setupGracefulShutdown } from "@workmateiq/common"

const PORT = process.env.PORT || 4000

const server = app.listen(PORT, () => console.log(`[${process.env.SERVICE_NAME}] listening on ${PORT}`))

setupGracefulShutdown(server)
