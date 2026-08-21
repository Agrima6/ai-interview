import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { requestContext, errorHandler, notFoundHandler } from "./middlewares/requestContext.js"
import authRoutes from "./routes/auth.routes.js"
import internalRoutes from "./routes/internal.routes.js"

const app = express()

// Behind nginx (X-Forwarded-For present on every request) - without this,
// express-rate-limit can't safely derive the real client IP and throws on
// every request through a rate-limited route.
app.set("trust proxy", 1)

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
app.use(cookieParser())
app.use(express.json())
app.use(requestContext)

app.get("/healthz", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))

app.use("/api/v1", authRoutes)
app.use("/internal/v1", internalRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
