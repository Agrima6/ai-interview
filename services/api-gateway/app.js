import express from "express"
import cors from "cors"
import crypto from "crypto"
import { createProxyMiddleware } from "http-proxy-middleware"
import { routeTable } from "./config/routeTable.js"
import { initRedis, isRedisEnabled } from "@workmateiq/common"
import { rateLimiter } from "./middlewares/rateLimit.js"
import { checkIsShuttingDown } from "@workmateiq/common"

const app = express()

initRedis().catch(err => {
    console.error("[api-gateway] Redis initialization error:", err.message)
})

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

app.use(checkIsShuttingDown)

app.get("/health", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))
app.get("/ready", (req, res) => {
    const isRedisReady = process.env.REDIS_ENABLED === "true" ? isRedisEnabled() : true
    if (isRedisReady) {
        return res.json({ status: "ready" })
    }
    return res.status(503).json({ status: "not ready", redis: isRedisReady })
})
app.get("/healthz", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))

app.use(rateLimiter())

app.use((req, res, next) => {
    req.headers["x-request-id"] = req.headers["x-request-id"] || crypto.randomUUID()
    req.headers["x-correlation-id"] = req.headers["x-correlation-id"] || req.headers["x-request-id"]
    next()
})

for (const { prefix, target } of routeTable) {
    if (!target) continue
    app.use(prefix, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path) => prefix + path,
    }))
}

app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } })
})

export default app
