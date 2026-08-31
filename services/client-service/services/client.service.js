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
const EDITABLE_FIELDS = [
    "name",
    "primaryContact.name",
    "primaryContact.email",
    "primaryContact.phone",
    "branding.primaryColor",
    "branding.secondaryColor",
    "branding.fontFamily",
    "branding.logoUrl",
]

const buildPatch = (body) => {
    const patch = {}
    if (body.name !== undefined) patch["name"] = body.name
    if (body.email !== undefined) patch["primaryContact.email"] = body.email
    if (body["primaryContact.email"] !== undefined) patch["primaryContact.email"] = body["primaryContact.email"]
    if (body.primaryContact?.email !== undefined) patch["primaryContact.email"] = body.primaryContact.email
    if (body.primaryContact?.name !== undefined) patch["primaryContact.name"] = body.primaryContact.name
    if (body.primaryContact?.phone !== undefined) patch["primaryContact.phone"] = body.primaryContact.phone

    const primaryColor = body.primaryColor ?? body.branding?.primaryColor ?? body["branding.primaryColor"]
    if (primaryColor !== undefined) patch["branding.primaryColor"] = primaryColor

    const secondaryColor = body.secondaryColor ?? body.branding?.secondaryColor ?? body["branding.secondaryColor"]
    if (secondaryColor !== undefined) patch["branding.secondaryColor"] = secondaryColor

    const fontFamily = body.fontFamily ?? body.branding?.fontFamily ?? body["branding.fontFamily"]
    if (fontFamily !== undefined) patch["branding.fontFamily"] = fontFamily

    const logoUrl = body.logoUrl ?? body.branding?.logoUrl ?? body["branding.logoUrl"]
    if (logoUrl !== undefined) patch["branding.logoUrl"] = logoUrl

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
    type: c.type,
    logoUrl: c.branding?.logoFileId && c.onboardingId
        ? `/api/v1/onboardings/${c.onboardingId}/files/${c.branding.logoFileId}/view`
        : (c.branding?.logoUrl || null),
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

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

const normalizeColor = (color) => {
    if (!color || typeof color !== "string") return undefined
    let trimmed = color.trim()
    if (!trimmed.startsWith("#") && /^[0-9a-f]{3,6}$/i.test(trimmed)) {
        trimmed = `#${trimmed}`
    }
    return HEX_COLOR.test(trimmed) ? trimmed : undefined
}

export const updateMyOrganizationBranding = async (tenantId, body = {}) => {
    if (!tenantId) throw new ApiError(403, "NOT_AN_ORGANIZATION_ACCOUNT", "This account is not linked to an organization.")

    const patch = {}

    // 1. Primary Color
    const rawPrimary = body.primaryColor ?? body.primary_color ?? body.primary ?? body.themeColor ?? body.color ?? body.branding?.primaryColor
    const primaryColor = normalizeColor(rawPrimary)
    if (primaryColor) patch["branding.primaryColor"] = primaryColor

    // 2. Secondary Color
    const rawSecondary = body.secondaryColor ?? body.secondary_color ?? body.secondary ?? body.branding?.secondaryColor
    const secondaryColor = normalizeColor(rawSecondary)
    if (secondaryColor) patch["branding.secondaryColor"] = secondaryColor

    // 3. Font Family
    const fontFamily = body.fontFamily ?? body.font_family ?? body.font ?? body.branding?.fontFamily
    if (fontFamily && typeof fontFamily === "string") patch["branding.fontFamily"] = fontFamily.trim()

    // 4. Logo URL
    const logoUrl = body.logoUrl ?? body.logo_url ?? body.logo ?? body.branding?.logoUrl
    if (logoUrl && typeof logoUrl === "string") patch["branding.logoUrl"] = logoUrl

    // 5. Name / Display Name
    const name = body.name ?? body.displayName ?? body.organizationName ?? body.companyName
    if (name && typeof name === "string" && name.trim()) patch["name"] = name.trim()

    // 6. Email
    const email = body.email ?? body.primaryContactEmail ?? body.contactEmail ?? body.primaryContact?.email
    if (email && typeof email === "string" && email.trim()) patch["primaryContact.email"] = email.trim()

    // If no valid editable fields were supplied, gracefully return current organization profile rather than throwing 400
    if (Object.keys(patch).length === 0) {
        return await getMyOrganization(tenantId)
    }

    const updated = await clientRepo.updateFields(tenantId, patch)
    if (!updated) throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "Organization not found.")
    return organizationView(updated)
}
