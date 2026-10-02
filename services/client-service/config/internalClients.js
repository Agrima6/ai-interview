import { createInternalApiClient } from "../utils/internalApiClient.js"

const client = createInternalApiClient({ serviceName: process.env.SERVICE_NAME })
const ctxHeaders = (ctx) => ({ requestId: ctx?.requestId, correlationId: ctx?.correlationId })

// Same shape as onboarding-service's communicationServiceClient - one
// shared "send" contract, communication-service owns the actual template
// content/rendering/provider dispatch.
export const communicationServiceClient = {
    send: (payload, ctx) =>
        client.post(`${process.env.COMMUNICATION_SERVICE_URL}/internal/v1/communications`, payload, {
            apiKey: process.env.COMMUNICATION_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
    // Per-candidate "invite sent / opened" status for a drive's candidate
    // table - see communication-service's Communication.metadata (this
    // service tags every CANDIDATE_INVITE send with {driveId, candidateId}).
    getInviteStatusForDrive: (driveId, eventType, ctx) =>
        client.get(`${process.env.COMMUNICATION_SERVICE_URL}/internal/v1/communications/drive/${driveId}/invite-status`, {
            apiKey: process.env.COMMUNICATION_SERVICE_API_KEY,
            params: { eventType },
            ...ctxHeaders(ctx),
        }),
}

// Creates (or re-links) a candidate's login account after they submit a
// public application - same contract onboarding-service already uses for
// createClientUser, one level down in auth-service.
export const authServiceClient = {
    createCandidateUser: (payload, ctx) =>
        client.post(`${process.env.AUTH_SERVICE_URL}/internal/v1/candidate-users`, payload, {
            apiKey: process.env.AUTH_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
}
