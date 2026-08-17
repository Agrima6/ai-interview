import { Router } from "express"
import * as formController from "../controllers/form.controller.js"

const router = Router()

router.get("/forms/registration/:type", formController.getRegistrationForm)

export default router
