import { Router } from "express"
import * as internalController from "../controllers/internal.controller.js"
import { authenticateService, requireServicePermission } from "@workmateiq/common"

const router = Router()

router.post(
    "/client-users",
    authenticateService,
    requireServicePermission("CLIENT_USER_CREATE"),
    internalController.createClientUser
)

export default router
