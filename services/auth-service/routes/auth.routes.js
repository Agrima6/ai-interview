import { Router } from "express"
import * as authController from "../controllers/auth.controller.js"
import { authenticate } from "../middlewares/authenticate.js"
import { loginRateLimit, refreshRateLimit } from "../middlewares/rateLimit.js"

const router = Router()

router.post("/auth/login", loginRateLimit, authController.login)
router.post("/auth/refresh", refreshRateLimit, authController.refresh)
router.post("/auth/logout", authController.logout)
router.post("/auth/google", authController.googleLogin)
router.post("/auth/change-password", authenticate, authController.changePassword)
router.get("/me", authenticate, authController.me)

export default router
