import { Router } from "express"
import * as authController from "../controllers/auth.controller.js"
import { authenticate } from "../middlewares/authenticate.js"

const router = Router()

router.post("/auth/login", authController.login)
router.post("/auth/refresh", authController.refresh)
router.post("/auth/logout", authController.logout)
router.post("/auth/google", authController.googleLogin)
router.post("/auth/change-password", authenticate, authController.changePassword)
router.get("/me", authenticate, authController.me)

export default router
