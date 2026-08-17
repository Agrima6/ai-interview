import express from "express"
import cors from "cors"
import { requestContext, errorHandler, notFoundHandler } from "./middlewares/requestContext.js"
import onboardingRoutes from "./routes/onboarding.routes.js"
import onboardingInternalRoutes from "./routes/onboarding.internal.routes.js"
import onboardingAdminRoutes from "./routes/onboarding.admin.routes.js"

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(requestContext)

app.get("/healthz", (req, res) => res.json({ status: "ok", service: process.env.SERVICE_NAME }))

app.use("/api/v1", onboardingRoutes)
app.use("/api/v1", onboardingAdminRoutes)
app.use("/", onboardingInternalRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
