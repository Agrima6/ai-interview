import "dotenv/config"
import app from "./app.js"

const PORT = process.env.PORT || 4007

app.listen(PORT, () => console.log(`[${process.env.SERVICE_NAME}] listening on ${PORT}`))
