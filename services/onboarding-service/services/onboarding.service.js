import mongoose from "mongoose"
import * as invitationRepo from "../repositories/invitation.repository.js"
import * as sessionRepo from "../repositories/session.repository.js"
import * as submissionRepo from "../repositories/submission.repository.js"
import * as reviewItemRepo from "../repositories/reviewItem.repository.js"
import { formServiceClient, clientServiceClient, authServiceClient, communicationServiceClient } from "../config/internalClients.js"
import { generateRawToken, hashToken, invitationExpiry } from "../utils/token.js"
import { validateAgainstFormVersion } from "../utils/formValidator.js"
import { ApiError } from "../utils/response.js"
import { filePathFor } from "../utils/localFileStore.js"


// Called internally by registration-service right after a registration is
// created. Owns token generation because this service owns
// onboarding_invitations - the raw token is returned once, over the private
// network, and never persisted here either.
export const createInvitationForRegistration = async ({ registrationId, type, contact }, ctx) => {
    const form = await formServiceClient.getPublishedForm(type, "ONBOARDING", ctx)

    const session = await sessionRepo.create({
        invitationId: new mongoose.Types.ObjectId(), // placeholder, patched below
        registrationId,
        type,
        contact,
        formVersionId: form.versionId,
    })

    const rawToken = generateRawToken()
    const invitation = await invitationRepo.create({
        registrationId,
        onboardingId: session._id,
        type,
        tokenHash: hashToken(rawToken),
        expiresAt: invitationExpiry(),
    })

    await sessionRepo.update(session._id, { invitationId: invitation._id })

    return { rawToken, onboardingId: String(session._id), invitationId: String(invitation._id) }
}

const assertInvitationUsable = (invitation, type) => {
    if (!invitation) throw new ApiError(404, "INVITATION_NOT_FOUND", "This onboarding link is not valid.")
    if (invitation.type !== type.toUpperCase()) throw new ApiError(404, "INVITATION_NOT_FOUND", "This onboarding link is not valid.")
    if (invitation.status === "REVOKED") throw new ApiError(410, "INVITATION_REVOKED", "This onboarding link has been replaced by a newer one.")
    if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) throw new ApiError(410, "INVITATION_EXPIRED", "This onboarding link has expired.")
}

// Verifies the caller actually holds the token for this onboarding id -
// autosave/upload/submit all gate on this, not on any user session.
const resolveOwnedSession = async (onboardingId, rawToken, type) => {
    if (!rawToken) throw new ApiError(401, "MISSING_TOKEN", "Onboarding token required.")
    const invitation = await invitationRepo.findByTokenHash(hashToken(rawToken))
    assertInvitationUsable(invitation, type)
    if (String(invitation.onboardingId) !== String(onboardingId)) {
        throw new ApiError(403, "TOKEN_SESSION_MISMATCH", "This token does not belong to this onboarding.")
    }
    const session = await sessionRepo.findById(onboardingId)
    if (!session) throw new ApiError(404, "ONBOARDING_NOT_FOUND", "Onboarding not found.")
    return { invitation, session }
}

export const getByToken = async (type, rawToken, ctx) => {
    const invitation = await invitationRepo.findByTokenHash(hashToken(rawToken))
    assertInvitationUsable(invitation, type)

    const session = await sessionRepo.findById(invitation.onboardingId)
    if (!session) throw new ApiError(404, "ONBOARDING_NOT_FOUND", "Onboarding not found.")

    await invitationRepo.markAccessed(invitation._id)
    if (session.status === "NOT_STARTED") await sessionRepo.update(session._id, { status: "IN_PROGRESS", startedAt: new Date() })

    const formVersion = await formServiceClient.getVersion(session.formVersionId, ctx)
    const reviewItems = await reviewItemRepo.findOpenForOnboarding(session._id)

    const logoFile = session.files?.find((f) => f.fieldKey === "logo")
    const logoUrl = logoFile ? `/api/v1/onboardings/${session._id}/files/${logoFile.fileId}/view` : null

    return {
        onboarding: {
            id: String(session._id),
            type: session.type,
            status: session.status,
            currentStep: session.currentStep,
        },
        form: {
            versionId: String(formVersion._id),
            sections: formVersion.sections,
        },
        data: session.data || {},
        files: session.files || [],
        branding: {
            logoUrl,
            primaryColor: session.data?.primary_color || null,
            secondaryColor: session.data?.secondary_color || null,
        },
        reviewItems: reviewItems.map((r) => ({ sectionKey: r.sectionKey, fieldKey: r.fieldKey, message: r.message })),
    }
}

export const autosave = async ({ onboardingId, rawToken, type, data, currentStep }) => {
    const { session } = await resolveOwnedSession(onboardingId, rawToken, type)
    if (["SUBMITTED", "APPROVED"].includes(session.status)) {
        throw new ApiError(409, "ONBOARDING_LOCKED", "This onboarding has already been submitted and can no longer be edited.")
    }
    const updated = await sessionRepo.mergeData(onboardingId, data || {}, currentStep)
    return { savedAt: updated.lastSavedAt, currentStep: updated.currentStep }
}

// Files are deduped by fieldKey (re-uploading the same field replaces it),
// but fieldKey is client-supplied and unchecked against the form - without a
// cap, repeated calls with distinct made-up fieldKey values could grow this
// array (and the files written to disk) without bound.
const MAX_SESSION_FILES = 20

export const registerFileUpload = async ({ onboardingId, rawToken, type, fieldKey, fileMeta }) => {
    const { session } = await resolveOwnedSession(onboardingId, rawToken, type)
    const files = (session.files || []).filter((f) => f.fieldKey !== fieldKey)
    if (files.length >= MAX_SESSION_FILES) {
        throw new ApiError(400, "TOO_MANY_FILES", `A submission can have at most ${MAX_SESSION_FILES} uploaded files.`)
    }
    const fileId = new mongoose.Types.ObjectId()
    files.push({ fieldKey, fileId, ...fileMeta, status: "AVAILABLE" })
    await sessionRepo.update(onboardingId, { files })
    return { fileId: String(fileId), fieldKey, ...fileMeta, status: "AVAILABLE" }
}

export const submit = async ({ onboardingId, rawToken, type, consent }, ctx) => {
    const { session } = await resolveOwnedSession(onboardingId, rawToken, type)
    if (["SUBMITTED", "APPROVED"].includes(session.status)) {
        throw new ApiError(409, "ALREADY_SUBMITTED", "This onboarding has already been submitted.")
    }
    if (!consent) throw new ApiError(400, "CONSENT_REQUIRED", "Consent is required to submit.")

    const formVersion = await formServiceClient.getVersion(session.formVersionId, ctx)
    const errors = validateAgainstFormVersion(formVersion, session.data, session.files)
    if (errors.length) throw new ApiError(422, "VALIDATION_FAILED", JSON.stringify(errors))

    const nextVersion = (await submissionRepo.latestVersionNumber(onboardingId)) + 1
    await submissionRepo.create({
        onboardingId,
        submissionVersion: nextVersion,
        formVersionId: session.formVersionId,
        data: session.data,
        files: session.files,
    })

    const status = nextVersion === 1 ? "SUBMITTED" : "RESUBMITTED"
    await sessionRepo.update(onboardingId, { status, submittedAt: new Date() })

    return { status, submissionVersion: nextVersion }
}

/* ==================== Authenticated admin/review endpoints ==================== */

const listView = (s) => ({
    id: String(s._id),
    type: s.type,
    status: s.status,
    contact: s.contact,
    name: s.data?.company_name || s.data?.college_name || s.data?.full_name || s.contact?.name,
    currentStep: s.currentStep,
    submittedAt: s.submittedAt,
    lastSavedAt: s.lastSavedAt,
    updatedAt: s.updatedAt,
})

export const listForReview = async ({ type, status, cursor, limit }) => {
    const { items, hasNext, nextCursor } = await sessionRepo.list({ type, status, cursor, limit })
    return { items: items.map(listView), hasNext, nextCursor }
}

export const getDetailForReview = async (id, ctx) => {
    const session = await sessionRepo.findById(id)
    if (!session) throw new ApiError(404, "ONBOARDING_NOT_FOUND", "Onboarding not found.")
    const formVersion = await formServiceClient.getVersion(session.formVersionId, ctx)
    const reviewItems = await reviewItemRepo.findOpenForOnboarding(id)
    return {
        ...listView(session),
        data: session.data,
        files: session.files,
        form: { versionId: String(formVersion._id), sections: formVersion.sections },
        reviewItems: reviewItems.map((r) => ({ id: String(r._id), sectionKey: r.sectionKey, fieldKey: r.fieldKey, message: r.message, status: r.status })),
    }
}

const clientNameFor = (type, data, contact) => {
    if (type === "ORGANIZATION") return data.company_name
    if (type === "COLLEGE") return data.college_name
    return contact?.name
}

// Approving an ORGANIZATION/COLLEGE onboarding is what actually creates the
// living client record - client-service owns that data, so we call it
// internally rather than writing to its collection directly.
export const approve = async (id, reviewerId, ctx) => {
    const session = await sessionRepo.findById(id)
    if (!session) throw new ApiError(404, "ONBOARDING_NOT_FOUND", "Onboarding not found.")
    if (!["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"].includes(session.status)) {
        throw new ApiError(409, "INVALID_STATE", `Cannot approve an onboarding in status ${session.status}.`)
    }

    const updated = await sessionRepo.update(id, { status: "APPROVED" })
    await reviewItemRepo.resolveAllForOnboarding(id)

    let client = null
    if (["ORGANIZATION", "COLLEGE"].includes(session.type)) {
        const clientName = clientNameFor(session.type, session.data, session.contact)
        const logoFile = session.files?.find((f) => f.fieldKey === "logo")
        const logoFileId = logoFile ? logoFile.fileId : null
        const primaryColor = session.data?.primary_color || null
        const secondaryColor = session.data?.secondary_color || null

        client = await clientServiceClient.upsertFromOnboarding({
            onboardingId: id,
            registrationId: session.registrationId,
            type: session.type,
            name: clientName,
            primaryContact: session.contact,
            branding: {
                logoFileId,
                primaryColor,
                secondaryColor,
            },
        }, ctx).catch(() => null)

        // Give the client their first login, then email the credentials -
        // best-effort on both: a reviewer can always re-trigger this via
        // support if either downstream call has a transient failure, and it
        // shouldn't block the approval itself from going through.
        let credentialsIssued = false
        if (client && session.contact?.email) {
            const credentials = await authServiceClient.createClientUser({
                email: session.contact.email,
                name: session.contact.name,
                clientId: client.id,
            }, ctx).catch(() => null)

            if (credentials) {
                credentialsIssued = true
                await communicationServiceClient.send({
                    entityType: "ONBOARDING", entityId: id, channel: "EMAIL",
                    eventType: "CLIENT_APPROVED", recipient: session.contact.email,
                    variables: {
                        recipientName: session.contact.name,
                        recipientEmail: session.contact.email,
                        clientName,
                        loginUrl: process.env.CLIENT_LOGIN_URL,
                        tempPassword: credentials.password,
                    },
                }, ctx).catch(() => null)
            }
        }

        // No email on file, or the login-account call failed - approval still
        // goes through (the client record exists), but this must be visible
        // to the reviewer instead of failing completely silently.
        if (client && !credentialsIssued) {
            return { ...listView(updated), client, warning: "Client approved, but no login account could be created - check the contact email and create credentials manually." }
        }
    }

    return { ...listView(updated), client }
}

export const reject = async (id, reason) => {
    const session = await sessionRepo.findById(id)
    if (!session) throw new ApiError(404, "ONBOARDING_NOT_FOUND", "Onboarding not found.")
    if (!["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"].includes(session.status)) {
        throw new ApiError(409, "INVALID_STATE", `Cannot reject an onboarding in status ${session.status}.`)
    }
    const updated = await sessionRepo.update(id, { status: "REJECTED" })
    if (reason) await reviewItemRepo.createMany([{ onboardingId: id, type: "GENERAL", message: reason, createdBy: "reviewer" }])
    return listView(updated)
}

// Creates the review items the candidate/org will see prefilled against
// their existing data, and flips status so the same link becomes editable
// again on next visit.
export const requestChanges = async (id, reviewerId, items) => {
    if (!items?.length) throw new ApiError(400, "ITEMS_REQUIRED", "At least one review item is required.")
    const session = await sessionRepo.findById(id)
    if (!session) throw new ApiError(404, "ONBOARDING_NOT_FOUND", "Onboarding not found.")

    await reviewItemRepo.createMany(items.map((item) => ({
        onboardingId: id,
        sectionKey: item.sectionKey || null,
        fieldKey: item.fieldKey || null,
        type: item.fieldKey ? "FIELD" : "GENERAL",
        message: item.message,
        createdBy: reviewerId,
    })))

    const updated = await sessionRepo.update(id, { status: "CHANGES_REQUESTED" })
    return listView(updated)
}

export const statistics = async () => {
    const byStatus = await sessionRepo.countByStatus()
    const recent = await sessionRepo.recentlyUpdated(10)
    return {
        byStatus,
        recent: recent.map((s) => ({ id: String(s._id), type: s.type, status: s.status, updatedAt: s.updatedAt, name: listView(s).name })),
    }
}

export const getFileDetails = async (onboardingId, fileId) => {
    const session = await sessionRepo.findById(onboardingId)
    if (!session) throw new ApiError(404, "ONBOARDING_NOT_FOUND", "Onboarding not found.")
    const fileRecord = session.files?.find((f) => String(f.fileId) === String(fileId))
    if (!fileRecord) throw new ApiError(404, "FILE_NOT_FOUND", "File not found.")
    return {
        path: filePathFor(onboardingId, fileId, fileRecord.originalName),
        mimeType: fileRecord.mimeType,
        originalName: fileRecord.originalName,
    }
}
