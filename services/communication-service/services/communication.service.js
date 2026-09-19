import mongoose from "mongoose"
import * as templateRepo from "../repositories/template.repository.js"
import * as communicationRepo from "../repositories/communication.repository.js"
import { getEmailProvider, resolveSender } from "../providers/emailProvider.js"
import { getWhatsAppProvider } from "../providers/whatsappProvider.js"
import { maskEmail, maskPhone } from "../utils/mask.js"
import { ApiError } from "../utils/response.js"
import { enqueueNotification } from "../config/sqsClient.js"

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

// Creates a QUEUED communication record and hands the actual send off to
// SQS (plan.md #7) - the notification-delivery worker (worker.js) is what
// calls the provider and updates the final status. This call returns as
// soon as the job is enqueued, not once the email/WhatsApp send completes.
//
// Two content modes:
//  - eventType-keyed (default): looks up one of this service's own
//    platform-wide Templates (channel+eventType), as onboarding/auth do.
//  - inline (`subject`/`body` passed directly): used by callers sending an
//    ORGANIZATION-CUSTOM template (e.g. client-service's per-tenant
//    NotificationTemplate, edited on the Templates page) - that template
//    store lives outside this service, so the caller renders it and hands
//    over final text; no template lookup or re-interpolation happens here.
const TRACKING_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:4005"
// 1x1 transparent GIF, served by the /track/open/:id route below.
const TRACKING_PIXEL_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7", "base64")

export const sendAndRecord = async ({ entityType, entityId, channel, eventType, recipient, variables, subject, body, metadata }) => {
    if (!recipient) throw new ApiError(400, "RECIPIENT_REQUIRED", "recipient is required.")
    if (!mongoose.isValidObjectId(entityId)) throw new ApiError(400, "INVALID_ENTITY_ID", "entityId must be a valid id.")

    let finalSubject, finalBody, finalHtml = null, templateId = null, templateVersion = null
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
        // The whole point of htmlBody existing on the template is to be
        // what actually gets sent - without this, every "HTML email" sent
        // through this path was silently going out as the plain-text
        // fallback instead, regardless of how the template was designed.
        if (template.htmlBody) finalHtml = interpolate(template.htmlBody, variables || {})
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
        metadata: metadata || null,
    })

    // Open-tracking pixel - only for real HTML emails, appended after the
    // record exists so it can carry that record's own id. A single
    // 1x1 image request is a weak signal (image-blocking clients never
    // fire it) but it's the same open-rate mechanism virtually every ESP
    // uses, and costs nothing when it doesn't fire.
    if (channel === "EMAIL" && finalHtml) {
        finalHtml += `<img src="${TRACKING_BASE_URL}/track/open/${communication._id}.gif" width="1" height="1" style="display:none" alt="" />`
    }

    // Organization-sent emails (candidate/team invites) carry the org's own
    // name in one of these variables - used as the visible sender name so
    // the recipient sees "QA Test Co", not just "WorkmateIQ", without
    // requiring every organization to have its own verified mailbox/domain.
    const fromName = variables?.company_name || variables?.organizationName || undefined

    try {
        await enqueueNotification({
            communicationId: String(communication._id),
            channel, recipient, finalSubject, finalBody, finalHtml,
            from: channel === "EMAIL" ? resolveSender(eventType) : undefined,
            fromName,
        })
        return view(communication)
    } catch (error) {
        // The queue itself is unreachable - fall back to sending inline so a
        // LocalStack/SQS outage doesn't silently swallow every notification
        // in the meantime (idempotency keys/backend aren't needed for the
        // synchronous fallback path since it never repeats a queued send).
        console.error(`[${process.env.SERVICE_NAME}] enqueue failed, sending inline:`, error.message)
        const updated = await dispatchCommunication(communication, { channel, recipient, finalSubject, finalBody, finalHtml, from: resolveSender(eventType), fromName })
        return view(updated)
    }
}

// Performs the actual provider call + final status update - shared by the
// synchronous fallback above and the notification-delivery worker
// (worker.js), which is the normal path once a job is enqueued.
export const dispatchCommunication = async (communication, { channel, recipient, finalSubject, finalBody, finalHtml, from, fromName }) => {
    try {
        const result = channel === "EMAIL"
            ? await getEmailProvider().send({ to: recipient, subject: finalSubject, body: finalBody, html: finalHtml || undefined, from, fromName })
            : await getWhatsAppProvider().send({ to: recipient, body: finalBody })

        const sentLike = result.status === "SENT" || result.status === "MOCK_SENT"
        return await communicationRepo.updateStatus(communication._id, {
            status: result.status,
            providerMessageId: result.providerMessageId,
            attempts: communication.attempts + 1,
            sentAt: sentLike ? new Date() : null,
        })
    } catch (error) {
        console.error(`[${process.env.SERVICE_NAME}] ${channel} send failed:`, error.message)
        return await communicationRepo.updateStatus(communication._id, {
            status: "FAILED",
            attempts: communication.attempts + 1,
            lastErrorCode: "PROVIDER_ERROR",
            failedAt: new Date(),
        })
    }
}

export const trackOpen = async (id) => {
    if (!mongoose.isValidObjectId(id)) return
    await communicationRepo.markOpened(id).catch(() => null)
}

// Per-candidate invite status for a drive's candidate table - the caller
// (client-service) doesn't know this service's Communication ids, only its
// own driveId/candidateId, which is why these were tagged as `metadata` on
// send. Returns the latest send per candidateId (a re-invite overwrites the
// status shown, matching "what's true right now" rather than history).
export const getInviteStatusForDrive = async (driveId, eventType) => {
    const records = await communicationRepo.listByDriveAndEvent(driveId, eventType)
    const byCandidateId = new Map()
    for (const record of records) {
        const candidateId = record.metadata?.candidateId
        if (!candidateId || byCandidateId.has(candidateId)) continue
        byCandidateId.set(candidateId, {
            candidateId,
            status: record.status,
            sentAt: record.sentAt,
            openedAt: record.openedAt,
        })
    }
    return [...byCandidateId.values()]
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

export { TRACKING_PIXEL_GIF }
