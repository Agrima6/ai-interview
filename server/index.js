import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/connectDb.js"
import cookieParser from "cookie-parser"
dotenv.config()
import cors from "cors"
import authRouter from "./routes/auth.route.js"
import userRouter from "./routes/user.route.js"
import interviewRouter from "./routes/interview.route.js"
import paymentRouter from "./routes/payment.route.js"
import adminRouter from "./routes/admin.route.js"
import questionBankRouter from "./routes/questionBank.route.js"
import interviewTemplateRouter from "./routes/interviewTemplate.route.js"
import inviteRouter from "./routes/invite.route.js"
import User from "./models/user.model.js"

const app = express()

// Always allow localhost (any port, for dev). In production, also allow the
// deployed frontend's origin(s) via CLIENT_URL (comma-separated if more than one).
const allowedOrigins = [
    /^http:\/\/localhost:\d+$/,
    /^https:\/\/ai-interview-[a-z0-9-]+-agrima-agarwals-projects\.vercel\.app$/,
    ...(process.env.CLIENT_URL || "").split(",").map((s) => s.trim()).filter(Boolean),
]

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true) // same-origin / non-browser requests (curl, server-to-server)
        const allowed = allowedOrigins.some((o) => (o instanceof RegExp ? o.test(origin) : o === origin))
        callback(allowed ? null : new Error("Not allowed by CORS"), allowed)
    },
    credentials:true
}))

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth" , authRouter)
app.use("/api/user", userRouter)
app.use("/api/interview" , interviewRouter)
app.use("/api/payment" , paymentRouter)
app.use("/api/admin" , adminRouter)
app.use("/api/question-banks" , questionBankRouter)
app.use("/api/interview-templates" , interviewTemplateRouter)
app.use("/api/invites" , inviteRouter)

// Ensures the designated Super Admin account exists (pre-registered, same
// mechanism an Admin uses to pre-register an Employee) so the first Google
// sign-in with this email lands as superadmin with no separate setup step.
const ensureSuperAdmin = async () => {
    if (!process.env.SUPERADMIN_EMAIL) return
    try {
        await User.findOneAndUpdate(
            { email: process.env.SUPERADMIN_EMAIL },
            {
                $set: { role: "superadmin" },
                $setOnInsert: { name: "Super Admin", email: process.env.SUPERADMIN_EMAIL },
            },
            { upsert: true, setDefaultsOnInsert: true }
        )
    } catch (error) {
        console.log(`ensureSuperAdmin error ${error}`)
    }
}

const PORT = process.env.PORT || 6000
app.listen(PORT , ()=>{
    console.log(`Server running on port ${PORT}`)
    connectDb().then(ensureSuperAdmin)
})
