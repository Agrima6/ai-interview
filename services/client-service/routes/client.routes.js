import { Router } from "express"
import * as clientController from "../controllers/client.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

router.get("/clients", authenticate, requirePermission("CLIENT_READ"), clientController.list)
router.get("/clients/:id", authenticate, requirePermission("CLIENT_READ"), clientController.getById)
router.get("/clients/:id/audit", authenticate, requirePermission("CLIENT_READ"), clientController.getAuditHistory)
router.patch("/clients/:id", authenticate, requirePermission("CLIENT_UPDATE"), clientController.update)
router.post("/clients/:id/approve", authenticate, requirePermission("CLIENT_APPROVE"), clientController.approve)
router.post("/clients/:id/reject", authenticate, requirePermission("CLIENT_REJECT"), clientController.reject)
router.post("/clients/:id/suspend", authenticate, requirePermission("CLIENT_UPDATE"), clientController.suspend)
router.post("/clients/:id/reactivate", authenticate, requirePermission("CLIENT_UPDATE"), clientController.reactivate)

export default router
