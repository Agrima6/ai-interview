import * as communicationService from "../services/communication.service.js"
import { ok } from "../utils/response.js"

// POST /internal/v1/communications - called by registration-service /
// onboarding-service to send + record a communication in one step.
export const send = async (req, res, next) => {
    try {
        const result = await communicationService.sendAndRecord(req.body)
        ok(res, result)
    } catch (error) { next(error) }
}

// GET /internal/v1/templates/:channel/:eventType
export const getTemplate = async (req, res, next) => {
    try {
        const template = await communicationService.getTemplate(req.params.channel.toUpperCase(), req.params.eventType)
        ok(res, template)
    } catch (error) { next(error) }
}
