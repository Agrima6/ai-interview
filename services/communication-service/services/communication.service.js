import mongoose from "mongoose"
import * as templateRepo from "../repositories/template.repository.js"
import * as communicationRepo from "../repositories/communication.repository.js"
import { getEmailProvider, resolveSender } from "../providers/emailProvider.js"
import { getWhatsAppProvider } from "../providers/whatsappProvider.js"
import { maskEmail, maskPhone } from "../utils/mask.js"
import { ApiError } from "../utils/response.js"

const interpolate = (template, variables) =>
    template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (variables[key] ?? ""))

const view = (c) => ({
    id: String(c._id),
    entityType: c.entityType,
    entityId: String(c.entityId),
    channel: c.channel,
    eventType: c.eventType,
    destinationMasked: c.destinationMasked,
    provider: c.provider,
    status: c.status,
    attempts: c.attempts,
    queuedAt: c.queuedAt,
    sentAt: c.sentAt,
    failedAt: c.failedAt,
})

// Creates + dispatches a communication in one call. QUEUE_MODE=local means
// there's no SQS hop - we just call the provider directly and record the
// resulting status, exactly as the local dev flow in the spec describes.
//
// Two content modes:
//  - eventType-keyed (default): looks up one of this service's own
//    platform-wide Templates (channel+eventType), as onboarding/auth do.
//  - inline (`subject`/`body` passed directly): used by callers sending an
//    ORGANIZATION-CUSTOM template (e.g. client-service's per-tenant
//    NotificationTemplate, edited on the Templates page) - that template
//    store lives outside this service, so the caller renders it and hands
//    over final text; no template lookup or re-interpolation happens here.
export const sendAndRecord = async ({ entityType, entityId, channel, eventType, recipient, variables, subject, body }) => {
    if (!recipient) throw new ApiError(400, "RECIPIENT_REQUIRED", "recipient is required.")
    if (!mongoose.isValidObjectId(entityId)) throw new ApiError(400, "INVALID_ENTITY_ID", "entityId must be a valid id.")

    let finalSubject, finalBody, templateId = null, templateVersion = null
    if (body) {
        finalSubject = subject || ""
        finalBody = body
    } else {
        const template = await templateRepo.findPublished(channel, eventType)
        if (!template) throw new ApiError(404, "TEMPLATE_NOT_FOUND", `No published ${channel} template for ${eventType}.`)
        templateId = template._id
        templateVersion = template.version
        finalSubject = interpolate(template.subject || "", variables || {})
        finalBody = interpolate(template.body, variables || {})
    }

    const destinationMasked = channel === "EMAIL" ? maskEmail(recipient) : maskPhone(recipient)
    const provider = channel === "EMAIL" ? "EMAIL_PROVIDER" : "META"
    // "gmail" is as real a send as "direct" (Resend) - both dispatch to an
    // actual provider via getEmailProvider()/getWhatsAppProvider(); only
    // the true no-op mock mode should ever be labeled "MOCK" here. This
    // previously mislabeled real Gmail-SMTP sends as MOCK in the audit
    // trail even though the email genuinely went out.
    const REAL_MODES = ["direct", "gmail"]
    const providerLabel = REAL_MODES.includes(process.env[`${channel}_MODE`]) ? provider : "MOCK"

    const communication = await communicationRepo.create({
        entityType, entityId, channel, eventType,
        templateId, templateVersion,
        destinationMasked, provider: providerLabel, status: "QUEUED",
    })

    try {
        // Organization-sent emails (candidate/team invites) carry the org's
        // own name in one of these variables - used as the visible sender
        // name so the recipient sees "QA Test Co", not just "WorkmateIQ",
        // without requiring every organization to have its own verified
        // mailbox/domain.
        const fromName = variables?.company_name || variables?.organizationName || undefined
        const result = channel === "EMAIL"
            ? await getEmailProvider().send({ to: recipient, subject: finalSubject, body: finalBody, from: resolveSender(eventType), fromName })
            : await getWhatsAppProvider().send({ to: recipient, body: finalBody })

        const sentLike = result.status === "SENT" || result.status === "MOCK_SENT"
        const updated = await communicationRepo.updateStatus(communication._id, {
            status: result.status,
            providerMessageId: result.providerMessageId,
            attempts: communication.attempts + 1,
            sentAt: sentLike ? new Date() : null,
        })
        return view(updated)
    } catch (error) {
        console.error(`[${process.env.SERVICE_NAME}] ${channel} send failed:`, error.message)
        const updated = await communicationRepo.updateStatus(communication._id, {
            status: "FAILED",
            attempts: communication.attempts + 1,
            lastErrorCode: "PROVIDER_ERROR",
            failedAt: new Date(),
        })
        return view(updated)
    }
}

export const getTemplate = async (channel, eventType) => {
    const template = await templateRepo.findPublished(channel, eventType)
    if (!template) throw new ApiError(404, "TEMPLATE_NOT_FOUND", `No published ${channel} template for ${eventType}.`)
    return template
}

export const listForEntity = async (entityType, entityId) => {
    const items = await communicationRepo.listByEntity(entityType, entityId)
    return items.map(view)
}

export const retry = async (id) => {
    const communication = await communicationRepo.findById(id)
    if (!communication) throw new ApiError(404, "COMMUNICATION_NOT_FOUND", "Communication not found.")
    if (!["FAILED"].includes(communication.status)) {
        throw new ApiError(400, "NOT_RETRYABLE", "Only failed communications can be retried.")
    }
    // A real retry would re-resolve the recipient from the owning entity;
    // for this slice we just flip it back to queued for visibility.
    const updated = await communicationRepo.updateStatus(id, { status: "QUEUED", attempts: communication.attempts + 1 })
    return view(updated)
}
