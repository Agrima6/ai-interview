import { Router } from "express"
import * as driveController from "../controllers/interviewDrive.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"

const router = Router()

// All drive routes are tenant-scoped via authenticate middleware. Reuses
// CLIENT_SELF_READ/CLIENT_SELF_UPDATE (the "manage my own organization"
// permissions already seeded on CLIENT_ADMIN) rather than inventing a
// parallel drive-specific permission scheme for what is still exclusively
// self-service, tenant-scoped access.
// Public candidate-facing lookup - no auth, must be registered before
// "/drives/:id" or Express would try to treat "public" as a drive id.
router.get("/drives/public/:link", driveController.getPublicDriveBySlug)

router.get("/drives", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.listDrives)
router.post("/drives", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.createDrive)
router.get("/drives/:id", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.getDriveById)
router.post("/drives/:id/rounds", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.addRoundToDrive)
router.patch("/drives/:id/status", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateDriveStatus)
router.patch("/drives/:id/rounds/:roundNumber/candidates/:candidateId/status", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateCandidateStatus)

router.get("/candidates", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.listAllCandidates)

export default router
