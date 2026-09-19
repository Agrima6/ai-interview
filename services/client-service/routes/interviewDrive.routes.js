import { Router } from "express"
import * as driveController from "../controllers/interviewDrive.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { uploadResume } from "../middlewares/resumeUpload.js"
import { uploadRecording } from "../middlewares/recordingUpload.js"

const router = Router()

// All drive routes are tenant-scoped via authenticate middleware. Reuses
// CLIENT_SELF_READ/CLIENT_SELF_UPDATE (the "manage my own organization"
// permissions already seeded on CLIENT_ADMIN) rather than inventing a
// parallel drive-specific permission scheme for what is still exclusively
// self-service, tenant-scoped access.
// Public candidate-facing lookup - no auth, must be registered before
// "/drives/:id" or Express would try to treat "public" as a drive id.
router.get("/drives/public/:link", driveController.getPublicDriveBySlug)
router.get("/drives/public/:link/prefill", driveController.getPublicApplicationPrefill)
router.post("/drives/public/:link/apply", uploadResume.single("resume"), driveController.applyToPublicDrive)

router.get("/drives", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.listDrives)
router.post("/drives", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.createDrive)
// Must be registered before "/drives/:id" or Express would treat "export" as a drive id.
router.get("/drives/export", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.exportDrivesCsv)
router.get("/drives/:id", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.getDriveById)
router.post("/drives/:id/candidates", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.addCandidatesToDrive)
router.post("/drives/:id/rounds", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.addRoundToDrive)
router.patch("/drives/:id/status", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateDriveStatus)
router.patch("/drives/:id/rounds/:roundNumber/status", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateRoundStatus)
router.patch("/drives/:id/rounds/:roundNumber", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateRound)
router.patch("/drives/:id/rounds/:roundNumber/candidates/:candidateId/status", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateCandidateStatus)
router.patch("/drives/:id/rounds/:roundNumber/candidates/:candidateId", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateCandidate)
router.delete("/drives/:id/rounds/:roundNumber/candidates/:candidateId", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.removeCandidate)
router.post("/drives/:id/rounds/:roundNumber/candidates/communicate", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.communicateWithCandidates)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/resume", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.downloadCandidateResume)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/recording", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.streamCandidateRecording)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/violations/:violationIndex/:type", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.streamCandidateViolationSnapshot)

router.get("/candidate/me/interviews", authenticate, driveController.getMyInterviews)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/apply", authenticate, uploadResume.single("resume"), driveController.completeCandidateApplication)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/violations", authenticate, driveController.recordCandidateViolation)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/complete", authenticate, driveController.completeCandidateInterview)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/agent-session", authenticate, driveController.startAgentInterview)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/agent-complete", authenticate, driveController.completeAgentInterview)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/recording", authenticate, uploadRecording.single("recording"), driveController.saveCandidateRecording)

router.get("/candidates", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.listAllCandidates)
router.get("/candidates/export", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.exportCandidatesCsv)

export default router
