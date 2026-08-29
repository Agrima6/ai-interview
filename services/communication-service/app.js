import express from "express"
import cors from "cors"
import mongoose from "mongoose"
import { requestContext, errorHandler, notFoundHandler } from "@workmateiq/common"
import communicationInternalRoutes from "./routes/communication.internal.routes.js"
import { checkIsShuttingDown } from "@workmateiq/common"
import { getDirectEventRouter } from "@workmateiq/common"

const app = express()

const DEFAULT_ALLOWED_ORIGINS = ["https://workmateiq.com", "https://www.workmateiq.com", "http://localhost:5173", "http://localhost:3000"]
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        callback(new Error("Not allowed by CORS"))
    },
    credentials: true,
}))
app.use(express.json())
app.use(requestContext)
app.use(checkIsShuttingDown)

app.get("/health", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))
app.get("/ready", (req, res) => {
    const isMongoConnected = mongoose.connection && mongoose.connection.readyState === 1
    if (isMongoConnected) {
        return res.json({ status: "ready" })
    }
    return res.status(503).json({ status: "not ready", mongo: isMongoConnected })
})
app.get("/healthz", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))

app.use("/", communicationInternalRoutes)

app.use("/", getDirectEventRouter())

app.use(notFoundHandler)
app.use(errorHandler)

export default app
