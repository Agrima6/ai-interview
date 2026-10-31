import { Router } from "express"
import * as driveController from "../controllers/interviewDrive.controller.js"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { uploadResume } from "../middlewares/resumeUpload.js"
import { uploadRecording, uploadRecordingChunk } from "../middlewares/recordingUpload.js"

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
router.get("/drives/:id/results/export", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.exportDriveResultsCsv)
router.get("/drives/:id", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.getDriveById)
router.post("/drives/:id/candidates", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.addCandidatesToDrive)
router.post("/drives/:id/rounds", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.addRoundToDrive)
router.patch("/drives/:id/status", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateDriveStatus)
router.patch("/drives/:id/rounds/:roundNumber/status", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateRoundStatus)
router.patch("/drives/:id/rounds/:roundNumber", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateRound)
router.patch("/drives/:id/rounds/:roundNumber/candidates/:candidateId/status", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateCandidateStatus)
router.patch("/drives/:id/rounds/:roundNumber/candidates/:candidateId", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.updateCandidate)
router.delete("/drives/:id/rounds/:roundNumber/candidates/:candidateId", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.removeCandidate)
router.post("/drives/:id/rounds/:roundNumber/candidates/invite", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.resendInvites)
router.post("/drives/:id/rounds/:roundNumber/candidates/communicate", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.communicateWithCandidates)
router.post("/drives/:id/rounds/:roundNumber/communications/refresh", authenticate, requirePermission("CLIENT_SELF_UPDATE"), driveController.refreshRoundCommunications)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/transcript", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.getCandidateTranscript)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/resume", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.downloadCandidateResume)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/recording/manifest", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.getRecordingManifest)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/recording/link", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.getRecordingLink)
// No bearer token here by design: the signed, expiring link is the credential (a <video> element cannot send headers).
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/recording/view", driveController.viewRecording)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/recording", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.streamCandidateRecording)
router.get("/drives/:id/rounds/:roundNumber/candidates/:candidateId/violations/:violationIndex/:type", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.streamCandidateViolationSnapshot)

router.get("/candidate/me/interviews", authenticate, driveController.getMyInterviews)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/apply", authenticate, uploadResume.single("resume"), driveController.completeCandidateApplication)
router.patch("/candidate/me/interviews/:id/rounds/:roundNumber/reschedule", authenticate, driveController.rescheduleCandidateSlot)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/violations", authenticate, driveController.recordCandidateViolation)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/complete", authenticate, driveController.completeCandidateInterview)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/agent-session", authenticate, driveController.startAgentInterview)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/agent-complete", authenticate, driveController.completeAgentInterview)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/recording", authenticate, uploadRecording.single("recording"), driveController.saveCandidateRecording)
// Chunked in-session recording: slices are stored as they are captured, then finalized (see services/recording.service.js).
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/recording/chunk", authenticate, uploadRecordingChunk.single("chunk"), driveController.saveRecordingChunk)
router.post("/candidate/me/interviews/:id/rounds/:roundNumber/recording/finalize", authenticate, driveController.finalizeRecording)

// Not /dashboard/*: the gateway sends that prefix to the platform-admin dashboard-service.
router.get("/organizations/me/hiring-analytics/:metric", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.getDashboardMetric)
router.get("/candidates", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.listAllCandidates)
router.get("/candidates/export", authenticate, requirePermission("CLIENT_SELF_READ"), driveController.exportCandidatesCsv)

export default router
