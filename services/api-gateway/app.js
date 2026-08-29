import express from "express"
import cors from "cors"
import crypto from "crypto"
import { createProxyMiddleware } from "http-proxy-middleware"
import { routeTable } from "./config/routeTable.js"

const app = express()

// Origin allowlist instead of reflecting any Origin (origin: true) - that
// combined with credentials:true was the maximally permissive CORS config,
// letting any site make credentialed requests. ALLOWED_ORIGINS overrides
// the default list via env (comma-separated) without needing a code change.
const DEFAULT_ALLOWED_ORIGINS = ["https://workmateiq.com", "https://www.workmateiq.com", "http://localhost:5173", "http://localhost:3000"]
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS

app.use(cors({
    origin: (origin, callback) => {
        // No Origin header means a non-browser caller (server-to-server,
        // curl, mobile) - this check only protects browser-issued requests.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        callback(new Error("Not allowed by CORS"))
    },
    credentials: true,
}))

app.get("/healthz", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))

// Stamp trace IDs before proxying so every downstream service shares them.
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
        // Express's app.use(prefix, ...) strips the prefix from req.url
        // before the proxy ever sees it - add it back so each service
        // still receives the exact public /api/v1/* path it expects.
        pathRewrite: (path) => prefix + path,
    }))
}

app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } })
})

export default app
