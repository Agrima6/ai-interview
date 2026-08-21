import { Router } from "express"
import * as enquiryController from "../controllers/enquiry.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { submitRateLimit } from "../middlewares/rateLimit.js"

const router = Router()

router.post("/enquiries", submitRateLimit, enquiryController.submit)

router.get("/enquiries", authenticate, requirePermission("ENQUIRY_READ"), enquiryController.list)
router.get("/enquiries/:id", authenticate, requirePermission("ENQUIRY_READ"), enquiryController.getById)
router.patch("/enquiries/:id", authenticate, requirePermission("ENQUIRY_UPDATE"), enquiryController.update)
router.post("/enquiries/:id/call", authenticate, requirePermission("ENQUIRY_CALL"), enquiryController.call)

export default router
