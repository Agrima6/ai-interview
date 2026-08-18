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
    const { items, hasNext, nextCursor } = await clientRepo.list(query)
    return { items: items.map(view), hasNext, nextCursor }
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

export const statistics = () => clientRepo.countByStatus()
