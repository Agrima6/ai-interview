import { Router } from "express"
import * as registrationController from "../controllers/registration.controller.js"

const router = Router()

router.get("/registration-types", registrationController.getTypes)
router.get("/captcha", registrationController.getCaptcha)
router.post("/registrations", registrationController.submit)

export default router
