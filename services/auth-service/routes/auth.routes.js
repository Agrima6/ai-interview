import { Router } from "express"
import * as authController from "../controllers/auth.controller.js"
import { authenticate } from "../middlewares/authenticate.js"
import { loginRateLimit, refreshRateLimit, forgotPasswordRateLimit, resetPasswordRateLimit } from "../middlewares/rateLimit.js"

const router = Router()

router.post("/auth/login", loginRateLimit, authController.login)
router.post("/auth/refresh", refreshRateLimit, authController.refresh)
router.post("/auth/logout", authController.logout)
router.post("/auth/forgot-password", forgotPasswordRateLimit, authController.forgotPassword)
router.post("/auth/reset-password", resetPasswordRateLimit, authController.resetPassword)
router.post("/auth/google", authController.googleLogin)
router.post("/auth/change-password", authenticate, authController.changePassword)
router.get("/me", authenticate, authController.me)

export default router
