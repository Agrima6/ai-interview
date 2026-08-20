import { Router } from "express"
import * as formController from "../controllers/form.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

router.get("/forms/registration/:type", formController.getRegistrationForm)
router.get("/forms", authenticate, requirePermission("FORM_READ"), formController.listForms)
router.get("/forms/:type/:stage", authenticate, requirePermission("FORM_READ"), formController.getForm)
router.post("/forms/:type/:stage", authenticate, requirePermission("FORM_WRITE"), formController.saveForm)
router.post("/forms/:type/:stage/publish", authenticate, requirePermission("FORM_PUBLISH"), formController.publishForm)

export default router
