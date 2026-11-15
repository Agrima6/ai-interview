import "dotenv/config"
import app from "./app.js"
import connectDb from "./config/connectDb.js"
import { finalizeExpiredAttempts } from "./services/oaExam.service.js"

const PORT = process.env.PORT || 4006

connectDb().then(() => {
    app.listen(PORT, () => console.log(`[${process.env.SERVICE_NAME}] listening on ${PORT}`))
    // Online Assessment: submit anyone whose time ran out, even if their browser is closed.
    setInterval(() => finalizeExpiredAttempts().catch((e) => console.error("[client-service] OA sweep failed:", e.message)), 30 * 1000).unref()
})
