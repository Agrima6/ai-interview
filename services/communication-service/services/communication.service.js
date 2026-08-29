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
export const sendAndRecord = async ({ entityType, entityId, channel, eventType, recipient, variables }) => {
    if (!recipient) throw new ApiError(400, "RECIPIENT_REQUIRED", "recipient is required.")
    if (!mongoose.isValidObjectId(entityId)) throw new ApiError(400, "INVALID_ENTITY_ID", "entityId must be a valid id.")

    const template = await templateRepo.findPublished(channel, eventType)
    if (!template) throw new ApiError(404, "TEMPLATE_NOT_FOUND", `No published ${channel} template for ${eventType}.`)

    const destinationMasked = channel === "EMAIL" ? maskEmail(recipient) : maskPhone(recipient)
    const provider = channel === "EMAIL" ? "EMAIL_PROVIDER" : "META"
    const providerLabel = process.env[`${channel}_MODE`] === "direct" ? provider : "MOCK"

    const communication = await communicationRepo.create({
        entityType, entityId, channel, eventType,
        templateId: template._id, templateVersion: template.version,
        destinationMasked, provider: providerLabel, status: "QUEUED",
    })

    try {
        const body = interpolate(template.body, variables)
        const html = template.htmlBody ? interpolate(template.htmlBody, variables) : undefined
        const result = channel === "EMAIL"
            ? await getEmailProvider().send({ to: recipient, subject: interpolate(template.subject || "", variables), body, html, from: resolveSender(eventType) })
            : await getWhatsAppProvider().send({ to: recipient, body })

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
