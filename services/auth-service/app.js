import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { requestContext, errorHandler, notFoundHandler } from "./middlewares/requestContext.js"
import authRoutes from "./routes/auth.routes.js"

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())
app.use(requestContext)

app.get("/healthz", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))

app.use("/api/v1", authRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
