import * as clientRepo from "../repositories/client.repository.js"
import { ApiError } from "../utils/response.js"

const view = (c) => ({
    id: String(c._id),
    onboardingId: String(c.onboardingId),
    type: c.type,
    name: c.name,
    primaryContact: c.primaryContact,
    status: c.status,
    subdomain: c.subdomain,
    branding: c.branding,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
})

// Called internally by onboarding-service the moment an ORGANIZATION/COLLEGE
// onboarding is approved - this is what turns a completed onboarding into a
// living client record.
export const upsertFromOnboarding = async (payload) => {
    const client = await clientRepo.upsertByOnboarding(payload.onboardingId, {
        registrationId: payload.registrationId,
        type: payload.type,
        name: payload.name,
        primaryContact: payload.primaryContact,
        status: "ACTIVE",
        subdomain: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
        branding: payload.branding || {},
    })
    return view(client)
}

export const list = async (query) => {
    const result = await clientRepo.list(query)
    return { ...result, items: result.items.map(view) }
}

export const getById = async (id) => {
    const client = await clientRepo.findById(id)
    if (!client) throw new ApiError(404, "CLIENT_NOT_FOUND", "Client not found.")
    return view(client)
}

export const setStatus = async (id, status) => {
    const client = await clientRepo.updateStatus(id, status)
    if (!client) throw new ApiError(404, "CLIENT_NOT_FOUND", "Client not found.")
    return view(client)
}

// Operationally-safe fields an admin may edit. Deliberately excludes:
// type (reclassifying a client is a separate business operation, not a
// field edit - see PROJECT notes), status (goes through
// approve/reject/suspend/reactivate, which already have their own audit
// trail via those endpoints), subdomain (routing-sensitive), and every
// system-managed field (id/onboardingId/registrationId/createdAt/updatedAt).
const EDITABLE_FIELDS = ["name", "primaryContact.name", "primaryContact.email", "primaryContact.phone", "branding.primaryColor", "branding.secondaryColor"]

const getPath = (obj, path) => path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj)

// Whitelists the patch to exactly EDITABLE_FIELDS - any other property on
// the request body (id, type, status, ...) is silently dropped rather than
// accepted, so the update endpoint can never be used to smuggle a change to
// an immutable/system field.
const buildPatch = (body) => {
    const patch = {}
    for (const field of EDITABLE_FIELDS) {
        const value = getPath(body, field)
        if (value !== undefined) patch[field] = value
    }
    return patch
}

export const updateClient = async (id, body, { expectedUpdatedAt, actor } = {}) => {
    const patch = buildPatch(body)
    if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "NO_EDITABLE_FIELDS", "No editable fields were provided.")
    }

    const result = await clientRepo.updateFields(id, patch, expectedUpdatedAt)
    if (result === null) throw new ApiError(404, "CLIENT_NOT_FOUND", "Client not found.")
    if (result === "CONFLICT") {
        throw new ApiError(409, "CLIENT_UPDATE_CONFLICT", "This client was updated by another user. Please reload the latest data before saving.")
    }

    await clientRepo.addAuditEntry({
        clientId: id,
        changedBy: actor?.id,
        changedByEmail: actor?.email || null,
        changedFields: Object.keys(patch),
    })

    return view(result)
}

export const getAuditHistory = async (id) => {
    const entries = await clientRepo.listAuditEntries(id)
    return entries.map((e) => ({
        id: String(e._id),
        changedBy: e.changedBy ? String(e.changedBy) : null,
        changedByEmail: e.changedByEmail,
        changedFields: e.changedFields,
        createdAt: e.createdAt,
    }))
}

export const statistics = (filters) => clientRepo.countByStatus(filters)

// "Organization" self-service view - what a signed-in client-portal admin
// sees of their own account (GET/PATCH /organizations/me). This is the
// same Client document as everywhere else in client-service, reshaped to
// match the Organization model's field names - a separate
// "organization-service" would just be a second copy of this exact model.
const organizationView = (c) => ({
    id: String(c._id),
    name: c.name,
    displayName: c.name,
    slug: c.subdomain,
    // No File/Media service exists yet to turn logoFileId into a real
    // (signed) URL - stays null rather than a fake one until it does.
    logoUrl: null,
    primaryColor: c.branding?.primaryColor || null,
    secondaryColor: c.branding?.secondaryColor || null,
    fontFamily: c.branding?.fontFamily || null,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
})

// `tenantId` comes from the caller's JWT (req.user.tenantId), never from
// the request body/params - see auth.service.js#createClientUser, where a
// client-portal user's tenantId is set to their own Client document's
// _id, so this is exactly "find my own organization", nothing else can be
// requested through this endpoint.
export const getMyOrganization = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "NOT_AN_ORGANIZATION_ACCOUNT", "This account is not linked to an organization.")
    const client = await clientRepo.findById(tenantId)
    if (!client) throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "Organization not found.")
    return organizationView(client)
}

const BRANDING_FIELDS = ["branding.primaryColor", "branding.secondaryColor", "branding.fontFamily"]
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export const updateMyOrganizationBranding = async (tenantId, body) => {
    if (!tenantId) throw new ApiError(403, "NOT_AN_ORGANIZATION_ACCOUNT", "This account is not linked to an organization.")

    const patch = {}
    for (const field of BRANDING_FIELDS) {
        const value = getPath(body, field)
        if (value === undefined) continue
        if (field !== "branding.fontFamily" && !HEX_COLOR.test(value)) {
            throw new ApiError(400, "INVALID_COLOR", `${field.split(".")[1]} must be a valid hex color.`)
        }
        patch[field] = value
    }
    if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "NO_EDITABLE_FIELDS", "No editable branding fields were provided.")
    }

    const updated = await clientRepo.updateFields(tenantId, patch)
    if (!updated) throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "Organization not found.")
    return organizationView(updated)
}
