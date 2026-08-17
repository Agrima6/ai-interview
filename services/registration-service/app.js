import express from "express"
import cors from "cors"
import { requestContext, errorHandler, notFoundHandler } from "./middlewares/requestContext.js"
import registrationRoutes from "./routes/registration.routes.js"

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(requestContext)

app.get("/healthz", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))

app.use("/api/v1", registrationRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
