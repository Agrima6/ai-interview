import { Router } from "express"
import { authenticate, requirePermission } from "../middlewares/authenticate.js"
import { ok } from "../utils/response.js"
import * as voiceProvider from "../services/voiceProvider.service.js"

const router = Router()

// Platform administrators only (SUPER_ADMIN carries SETTINGS_WRITE). Reading is as restricted as writing: the setting
// reveals which providers the platform has credentials for.
const adminOnly = [authenticate, requirePermission("SETTINGS_WRITE")]

router.get("/admin/settings/voice-provider", ...adminOnly, async (req, res, next) => {
    try {
        ok(res, await voiceProvider.getVoiceProviderSetting())
    } catch (error) {
        next(error)
    }
})

router.put("/admin/settings/voice-provider", ...adminOnly, async (req, res, next) => {
    try {
        // The actor comes from the verified token, never from the request body.
        const actor = req.user?.email || req.user?.sub
        ok(res, await voiceProvider.updateVoiceProviderSetting(req.body || {}, actor))
    } catch (error) {
        next(error)
    }
})

export default router
