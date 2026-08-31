import { Router } from "express"
import * as driveController from "../controllers/interviewDrive.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

// All drive routes are tenant-scoped via authenticate middleware
router.get("/drives", authenticate, driveController.listDrives)
router.post("/drives", authenticate, driveController.createDrive)
router.get("/drives/:id", authenticate, driveController.getDriveById)
router.post("/drives/:id/rounds", authenticate, driveController.addRoundToDrive)
router.patch("/drives/:id/status", authenticate, driveController.updateDriveStatus)

export default router
