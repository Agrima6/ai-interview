import { Router } from "express"
import * as clientController from "../controllers/client.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

router.get("/clients", authenticate, requirePermission("CLIENT_READ"), clientController.list)
router.get("/clients/:id", authenticate, requirePermission("CLIENT_READ"), clientController.getById)
router.post("/clients/:id/approve", authenticate, requirePermission("CLIENT_APPROVE"), clientController.approve)
router.post("/clients/:id/reject", authenticate, requirePermission("CLIENT_REJECT"), clientController.reject)

export default router
