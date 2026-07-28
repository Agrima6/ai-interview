import express from "express"
import { googleAuth, guestAuth, logOut } from "../controllers/auth.controller.js"

const authRouter = express.Router()


authRouter.post("/google",googleAuth)
authRouter.post("/guest",guestAuth)
authRouter.get("/logout",logOut)


export default authRouter