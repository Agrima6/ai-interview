import { Router } from "express"
import * as registrationController from "../controllers/registration.controller.js"
import { submitRateLimit } from "../middlewares/rateLimit.js"

const router = Router()

router.get("/registration-types", registrationController.getTypes)
router.get("/captcha", registrationController.getCaptcha)
router.post("/registrations", submitRateLimit, registrationController.submit)

export default router
