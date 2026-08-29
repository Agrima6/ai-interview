import * as formService from "../services/form.service.js"
import { ok } from "@workmateiq/common"

export const listForms = async (req, res, next) => {
    try {
        const forms = await formService.listDefinitions()
        ok(res, forms)
    } catch (error) { next(error) }
}

export const getForm = async (req, res, next) => {
    try {
        const { type, stage } = req.params
        const form = await formService.getByTypeAndStage(type.toUpperCase(), stage.toUpperCase())
        ok(res, form)
    } catch (error) { next(error) }
}

export const saveForm = async (req, res, next) => {
    try {
        const { type, stage } = req.params
        const form = await formService.saveDraft({
            type: type.toUpperCase(),
            stage: stage.toUpperCase(),
            name: req.body?.name,
            sections: req.body?.sections || [],
        })
        ok(res, form)
    } catch (error) { next(error) }
}

export const publishForm = async (req, res, next) => {
    try {
        const { type, stage } = req.params
        const form = await formService.publishLatest({
            type: type.toUpperCase(),
            stage: stage.toUpperCase(),
            name: req.body?.name,
        })
        ok(res, form)
    } catch (error) { next(error) }
}

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
