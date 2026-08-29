import { Router } from "express"
import * as formController from "../controllers/form.controller.js"
import { authenticateService, requireServicePermission } from "@workmateiq/common"

const router = Router()

router.get(
    "/internal/v1/forms/:type/:stage/published",
    authenticateService,
    requireServicePermission("FORM_READ"),
    formController.getPublishedInternal
)
router.get(
    "/internal/v1/form-versions/:versionId",
    authenticateService,
    requireServicePermission("FORM_READ"),
    formController.getVersionInternal
)

export default router
