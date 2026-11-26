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

// HTML is interpolated with every value escaped (an organization or candidate name is data, never markup); a variable whose
// name ends in `_html` is trusted markup built by this platform.
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
export const interpolateHtml = (template, variables) =>
    template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (key.endsWith("_html") ? (variables[key] ?? "") : escapeHtml(variables[key])))

// The organization's logo goes above its name in the branded email shells (see utils/emailHtml.js). Done on the rendered
// email, so templates already saved in the database get the logo without being re-seeded. Only a plain http(s) address.
const HERO_NAME = '<p style="margin:0 0 8px;font-size:15px;font-weight:800;color:#ffffff;">'
const PLAIN_NAME = '<span style="font-size:19px;font-weight:800;color:#1a1215;">'
export const injectOrgLogo = (html, logoUrl, name) => {
    if (!html || !/^https?:\/\/[^\s"'<>]+$/i.test(String(logoUrl || ""))) return html
    const alt = escapeHtml(name || "")
    const img = (extra) => `<img src="${logoUrl}" alt="${alt}" height="44" style="display:block;height:44px;max-width:180px;width:auto;border:0;${extra}" />`
    if (html.includes(HERO_NAME)) return html.replace(HERO_NAME, `${img("margin:0 auto 12px;background:#ffffff;border-radius:10px;padding:5px;")}${HERO_NAME}`)
    if (html.includes(PLAIN_NAME)) return html.replace(PLAIN_NAME, `${img("margin:0 auto 10px;")}${PLAIN_NAME}`)
    return html
}

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

export const sendAndRecord = async ({ entityType, entityId, channel, eventType, recipient, variables, subject, body, html, metadata }) => {
    if (!recipient) throw new ApiError(400, "RECIPIENT_REQUIRED", "recipient is required.")
    if (!mongoose.isValidObjectId(entityId)) throw new ApiError(400, "INVALID_ENTITY_ID", "entityId must be a valid id.")

    let finalSubject, finalBody, finalHtml = null, templateId = null, templateVersion = null
    if (body) {
        finalSubject = subject || ""
        finalBody = body
        // An inline HTML version (a designed email) goes out alongside the plain text, which stays as the fallback.
        if (channel === "EMAIL" && typeof html === "string" && html.trim()) finalHtml = html.slice(0, 200000)
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
        if (template.htmlBody) finalHtml = injectOrgLogo(interpolateHtml(template.htmlBody, variables || {}), variables?.company_logo_url, variables?.company_name)
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
        recipient,
        subject: finalSubject,
        body: finalBody,
        html: finalHtml,
        destinationMasked, provider: providerLabel, status: "QUEUED",
        metadata: metadata || null,
        fromName: variables?.from_name || variables?.company_name || variables?.organizationName || null,
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
    const fromName = variables?.from_name || variables?.company_name || variables?.organizationName || undefined

    try {
        await enqueueNotification({
            communicationId: String(communication._id),
            channel, recipient, finalSubject, finalBody, finalHtml,
            from: channel === "EMAIL" ? resolveSender(eventType) : undefined,
            fromName,
        })
        return view(communication)
    } catch (error) {
        // In production, an enqueue failure must never block the HTTP request thread
        // with synchronous external calls unless explicit dev flag ALLOW_SYNC_NOTIFY=true
        if (process.env.NODE_ENV === "production" && process.env.ALLOW_SYNC_NOTIFY !== "true") {
            console.error(`[${process.env.SERVICE_NAME}] Queue unreachable in production; marked FAILED without blocking:`, error.message)
            const updated = await communicationRepo.updateStatus(communication._id, {
                status: "FAILED",
                lastErrorCode: "QUEUE_UNAVAILABLE",
                failedAt: new Date(),
            })
            return view(updated)
        }
        console.error(`[${process.env.SERVICE_NAME}] enqueue failed, sending inline:`, error.message)
        const updated = await dispatchCommunication(communication, { channel, recipient, finalSubject, finalBody, finalHtml, from: resolveSender(eventType), fromName })
        return view(updated)
    }
}

// Why a send failed, in a form a person can act on and a retry can decide on.
//  RATE_LIMITED / PROVIDER_ERROR_5XX / NETWORK: temporary: worth trying again.   REJECTED: the provider refused it (bad address, unverified sender...): retrying will not help.
export const RETRYABLE_CODES = ["RATE_LIMITED", "PROVIDER_5XX", "NETWORK"]
export const classifyFailure = (error) => {
    const status = error?.response?.status
    const data = error?.response?.data
    const reason = status
        ? `${status} ${typeof data === "string" ? data : data?.message || data?.error?.message || data?.error || data?.name || JSON.stringify(data || {})}`
        : `${error?.code || "no response"}: ${error?.message || "unknown error"}`
    const text = String(error?.message || "")
    let code = "PROVIDER_ERROR"
    if (status === 429 || /rate.?limit|too many|quota|exceeded|\b4[0-9]{2}\b.*(limit|quota)/i.test(`${reason} ${text}`)) code = "RATE_LIMITED"
    else if (status >= 500) code = "PROVIDER_5XX"
    else if (!status && /ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|timeout|timed out|Greeting never received/i.test(`${error?.code} ${text}`)) code = "NETWORK"
    else if (status >= 400) code = "REJECTED"
    return { code, reason: reason.replace(/\s+/g, " ").slice(0, 300) }
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
        const { code, reason } = classifyFailure(error)
        console.error(`[${process.env.SERVICE_NAME}] ${channel} send failed (${code}) to ${communication.destinationMasked}: ${reason}`)
        return await communicationRepo.updateStatus(communication._id, {
            status: "FAILED",
            attempts: communication.attempts + 1,
            lastErrorCode: code,
            lastError: reason,
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
    if (!communication.recipient) {
        throw new ApiError(400, "RECIPIENT_UNAVAILABLE", "Original recipient is not recorded for this message; cannot re-enqueue.")
    }

    const updated = await communicationRepo.updateStatus(id, {
        status: "QUEUED",
        attempts: communication.attempts + 1,
        lastErrorCode: null,
    })

    const fromName = communication.metadata?.company_name || communication.metadata?.organizationName || undefined
    await enqueueNotification({
        communicationId: String(communication._id),
        channel: communication.channel,
        recipient: communication.recipient,
        finalSubject: communication.subject || "",
        finalBody: communication.body || "",
        finalHtml: communication.html || null,
        from: communication.channel === "EMAIL" ? resolveSender(communication.eventType) : undefined,
        fromName,
    })

    return view(updated)
}

export { TRACKING_PIXEL_GIF }

// One row per invited person across many drives/assessments: whether the email went out and when it was first opened.
// Status and sent time follow the newest send; the opened time is the earliest open of ANY send, so a re-invite never hides it.
export const getInviteStatuses = async ({ driveIds, assessmentIds }) => {
    const clean = (ids) => [...new Set((Array.isArray(ids) ? ids : []).map(String).filter((id) => mongoose.isValidObjectId(id)))].slice(0, 500)
    const records = await communicationRepo.listInvites({ driveIds: clean(driveIds), assessmentIds: clean(assessmentIds) })
    const rows = new Map()
    for (const record of records) {
        const m = record.metadata || {}
        const sourceId = m.driveId || m.assessmentId
        const personId = m.candidateId || m.studentId
        if (!sourceId || !personId) continue
        const id = `${sourceId}|${personId}`
        const row = rows.get(id)
        if (!row) { rows.set(id, { sourceId: String(sourceId), personId: String(personId), roundNumber: m.roundNumber || null, status: record.status, sentAt: record.sentAt, openedAt: record.openedAt || null, sends: 1 }); continue }
        row.sends += 1
        if (record.openedAt && (!row.openedAt || record.openedAt < row.openedAt)) row.openedAt = record.openedAt
        if (record.openedAt && row.status !== "FAILED") row.status = "OPENED"
    }
    return [...rows.values()]
}

// ---------- retrying temporary failures ----------

const RETRY_MAX_ATTEMPTS = 4
const RETRY_WINDOW_MS = 72 * 60 * 60 * 1000       // an invitation that is a day late still beats one that never arrives
const retryDelayMs = (attempts) => [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000][Math.min(Math.max(attempts, 1), 3) - 1]
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Emails that failed for a temporary reason (the provider busy or over its rate limit, a network blip) are sent again, a few times with
 * growing gaps, so a burst of invitations never leaves some candidates without their email. Emails the provider refused are not retried.
 * Sends are spaced out so the retry itself does not trip the rate limit again.
 */
export const retryFailedEmails = async ({ limit = 10, spacingMs = 700 } = {}) => {
    const now = Date.now()
    const due = await communicationRepo.listRetryable({ codes: RETRYABLE_CODES, maxAttempts: RETRY_MAX_ATTEMPTS, since: new Date(now - RETRY_WINDOW_MS), limit })
    let sent = 0; let tried = 0
    for (const c of due) {
        if (c.failedAt && now - new Date(c.failedAt).getTime() < retryDelayMs(c.attempts)) continue
        const claimed = await communicationRepo.claimForRetry(c._id)
        if (!claimed) continue
        tried += 1
        const html = claimed.html ? `${claimed.html}<img src="${TRACKING_BASE_URL}/track/open/${claimed._id}.gif" width="1" height="1" style="display:none" alt="" />` : null
        const result = await dispatchCommunication(claimed, { channel: claimed.channel, recipient: claimed.recipient, finalSubject: claimed.subject, finalBody: claimed.body, finalHtml: html, from: claimed.channel === "EMAIL" ? resolveSender(claimed.eventType) : undefined, fromName: claimed.fromName || undefined })
        if (result?.status && result.status !== "FAILED") sent += 1
        await pause(spacingMs)
    }
    return { tried, sent }
}
