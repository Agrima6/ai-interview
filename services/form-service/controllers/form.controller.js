import * as formService from "../services/form.service.js"
import { ok } from "../utils/response.js"

// GET /api/v1/forms/registration/:type - public, called via the gateway.
export const getRegistrationForm = async (req, res, next) => {
    try {
        const form = await formService.getPublished(req.params.type.toUpperCase(), "REGISTRATION")
        ok(res, form)
    } catch (error) { next(error) }
}

// GET /internal/v1/forms/:type/:stage/published - internal, called by
// registration-service (validating registrations) and onboarding-service
// (rendering + validating the onboarding form).
export const getPublishedInternal = async (req, res, next) => {
    try {
        const { type, stage } = req.params
        const form = await formService.getPublished(type.toUpperCase(), stage.toUpperCase())
        ok(res, form)
    } catch (error) { next(error) }
}

export const getVersionInternal = async (req, res, next) => {
    try {
        const version = await formService.getVersionById(req.params.versionId)
        ok(res, version)
    } catch (error) { next(error) }
}
