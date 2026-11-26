import "dotenv/config"
import app from "./app.js"
import connectDb from "./config/connectDb.js"
import { retryFailedEmails } from "./services/communication.service.js"

const PORT = process.env.PORT || 4005

connectDb().then(() => {
    app.listen(PORT, () => console.log(`[${process.env.SERVICE_NAME}] listening on ${PORT}`))
    // Emails that failed for a temporary reason are sent again (a few times, with growing gaps).
    setInterval(() => retryFailedEmails().catch((e) => console.error(`[${process.env.SERVICE_NAME}] email retry failed:`, e.message)), 60 * 1000).unref()
})
