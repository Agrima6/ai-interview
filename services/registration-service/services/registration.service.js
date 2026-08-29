import * as registrationRepo from "../repositories/registration.repository.js"
import { formServiceClient, onboardingServiceClient, communicationServiceClient } from "../config/internalClients.js"
import { validateAgainstFormVersion } from "../utils/formValidator.js"
import { verifyCaptcha } from "../utils/captcha.js"
import { ApiError } from "../utils/response.js"

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

    const invitation = await onboardingServiceClient.createInvitation(
        { registrationId: String(registration._id), type: normalizedType, contact, data },
        ctx
    )

    const onboardingUrl = `${process.env.ONBOARDING_BASE_URL}/${normalizedType.toLowerCase()}/${invitation.rawToken}`
    const clientName = clientNameFor(normalizedType, data)
    const variables = {
        recipientName: contact.name,
        recipientGreeting: contact.name || "there",
        clientName: clientName || "your institution",
        onboardingUrl,
        supportEmail: process.env.SUPPORT_EMAIL || "support@workmateiq.com",
    }

    const [email, whatsapp] = await Promise.all([
        communicationServiceClient.send({
            entityType: "REGISTRATION", entityId: registration._id, channel: "EMAIL",
            eventType: "ONBOARDING_LINK", recipient: contact.email, variables,
        }, ctx).catch((e) => ({ status: "FAILED", error: e.message })),
        communicationServiceClient.send({
            entityType: "REGISTRATION", entityId: registration._id, channel: "WHATSAPP",
            eventType: "ONBOARDING_LINK", recipient: contact.phone, variables,
        }, ctx).catch((e) => ({ status: "FAILED", error: e.message })),
    ])

    await registrationRepo.updateStatus(registration._id, "LINK_SENT")

    const response = {
        registrationId: String(registration._id),
        status: "LINK_SENT",
        communications: { email: email.status, whatsapp: whatsapp.status },
    }
    if (process.env.EXPOSE_LOCAL_ONBOARDING_URL === "true") {
        response.debugOnboardingUrl = onboardingUrl
    }
    return response
}
