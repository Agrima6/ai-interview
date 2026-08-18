import { createInternalApiClient } from "../utils/internalApiClient.js"

const client = createInternalApiClient({ serviceName: process.env.SERVICE_NAME })
const ctxHeaders = (ctx) => ({ requestId: ctx?.requestId, correlationId: ctx?.correlationId })

export const formServiceClient = {
    getPublishedForm: (type, stage, ctx) =>
        client.get(`${process.env.FORM_SERVICE_URL}/internal/v1/forms/${type}/${stage}/published`, {
            apiKey: process.env.FORM_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
    getVersion: (versionId, ctx) =>
        client.get(`${process.env.FORM_SERVICE_URL}/internal/v1/form-versions/${versionId}`, {
            apiKey: process.env.FORM_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
}

export const clientServiceClient = {
    upsertFromOnboarding: (payload, ctx) =>
        client.post(`${process.env.CLIENT_SERVICE_URL}/internal/v1/clients`, payload, {
            apiKey: process.env.CLIENT_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
}

export const authServiceClient = {
    createClientUser: (payload, ctx) =>
        client.post(`${process.env.AUTH_SERVICE_URL}/internal/v1/client-users`, payload, {
            apiKey: process.env.AUTH_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
}

export const communicationServiceClient = {
    send: (payload, ctx) =>
        client.post(`${process.env.COMMUNICATION_SERVICE_URL}/internal/v1/communications`, payload, {
            apiKey: process.env.COMMUNICATION_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
}
