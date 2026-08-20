import { Router } from "express"
import * as onboardingController from "../controllers/onboarding.controller.js"

const router = Router()

router.get("/onboarding/:type/:token", onboardingController.getByToken)
router.patch("/onboardings/:id", onboardingController.autosave)
router.post("/onboardings/:id/files/presign", onboardingController.presignFile)
router.post("/onboardings/:id/files/upload", onboardingController.uploadMiddleware, onboardingController.uploadFile)
router.post("/onboardings/:id/files/complete", onboardingController.completeFile)
router.get("/onboardings/:id/files/:fileId/view", onboardingController.viewFile)
router.post("/onboardings/:id/submit", onboardingController.submit)

export default router
