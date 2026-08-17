import "dotenv/config"
import app from "./app.js"
import connectDb from "./config/connectDb.js"

const PORT = process.env.PORT || 4004

connectDb().then(() => {
    app.listen(PORT, () => console.log(`[${process.env.SERVICE_NAME}] listening on ${PORT}`))
})
