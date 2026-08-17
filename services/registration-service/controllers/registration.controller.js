import * as registrationService from "../services/registration.service.js"
import { generateChallenge } from "../utils/captcha.js"
import { ok } from "../utils/response.js"

export const getTypes = (req, res) => ok(res, { types: registrationService.REGISTRATION_TYPES })

export const getCaptcha = (req, res) => ok(res, generateChallenge())

export const submit = async (req, res, next) => {
    try {
        const result = await registrationService.submit(req.body, { requestId: req.requestId, correlationId: req.correlationId })
        ok(res, result)
    } catch (error) { next(error) }
}
