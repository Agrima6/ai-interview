import * as registrationRepo from "../repositories/registration.repository.js"
import { formServiceClient, onboardingServiceClient, communicationServiceClient } from "../config/internalClients.js"
import { validateAgainstFormVersion } from "../utils/formValidator.js"
import { verifyCaptcha } from "../utils/captcha.js"
import { ApiError } from "@workmateiq/common"
import Outbox from "../models/outbox.model.js"

export const REGISTRATION_TYPES = [
    { key: "ORGANIZATION", label: "Organization" },
    { key: "COLLEGE", label: "College" },
    { key: "CANDIDATE", label: "Candidate" },
]

const clientNameFor = (type, data) => {
    if (type === "ORGANIZATION") return data.company_name
    if (type === "COLLEGE") return data.college_name
    return data.full_name
}

export const submit = async (payload, ctx) => {
    const { type, data, consent, captchaToken, captchaAnswer } = payload
    if (!consent) throw new ApiError(400, "CONSENT_REQUIRED", "You must accept the consent checkbox.")
    verifyCaptcha(captchaToken, captchaAnswer)

    const normalizedType = type?.toUpperCase()
    if (!REGISTRATION_TYPES.some((t) => t.key === normalizedType)) {
        throw new ApiError(400, "INVALID_TYPE", "Unknown registration type.")
    }

    const form = await formServiceClient.getPublishedForm(normalizedType, "REGISTRATION", ctx)
    const errors = validateAgainstFormVersion(form, data)
    if (errors.length) throw new ApiError(422, "VALIDATION_FAILED", JSON.stringify(errors))

    const contact = {
        name: data.contact_name || data.full_name,
        email: data.email,
        phone: data.phone,
    }

    const existing = await registrationRepo.findActiveByEmail(contact.email)
    if (existing) throw new ApiError(409, "ALREADY_REGISTERED", "You have already registered with this email. Check your inbox for the onboarding link, or contact us if you can't find it.")

    let registration
    try {
        registration = await registrationRepo.create({
            type: normalizedType,
            contact,
            data,
            formVersionId: form.versionId,
            status: "PROCESSING",
            consent: { accepted: true, acceptedAt: new Date() },
            captchaVerifiedAt: new Date(),
        })
    } catch (error) {
        // Defense-in-depth for the race the check above can't fully close:
        // two requests can both pass findActiveByEmail before either
        // commits, but the partial unique index on contact.email lets only
        // one create() succeed - the loser lands here as a duplicate key
        // error (E11000) rather than a raw 500.
        if (error.code === 11000) {
            throw new ApiError(409, "ALREADY_REGISTERED", "You have already registered with this email. Check your inbox for the onboarding link, or contact us if you can't find it.")
        }
        throw error
    }

    await Outbox.create({
        routingKey: "REGISTRATION_SUBMITTED",
        payload: {
            registrationId: String(registration._id),
            type: normalizedType,
            contact,
            data
        },
        headers: {
            correlationId: ctx.correlationId,
            requestId: ctx.requestId,
        }
    })

    return {
        registrationId: String(registration._id),
        status: "PROCESSING",
    }
}
