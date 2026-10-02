import { Router } from "express"
import * as internalController from "../controllers/internal.controller.js"
import { authenticateService, requireServicePermission } from "../middlewares/internalAuth.js"

const router = Router()

router.post(
    "/client-users",
    authenticateService,
    requireServicePermission("CLIENT_USER_CREATE"),
    internalController.createClientUser
)

router.post(
    "/candidate-users",
    authenticateService,
    requireServicePermission("CANDIDATE_USER_CREATE"),
    internalController.createCandidateUser
)

export default router
