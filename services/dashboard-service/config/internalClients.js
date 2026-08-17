import { createInternalApiClient } from "../utils/internalApiClient.js"

const client = createInternalApiClient({ serviceName: process.env.SERVICE_NAME })
const ctxHeaders = (ctx) => ({ requestId: ctx?.requestId, correlationId: ctx?.correlationId })

export const onboardingServiceClient = {
    getStatistics: (ctx) =>
        client.get(`${process.env.ONBOARDING_SERVICE_URL}/internal/v1/statistics`, {
            apiKey: process.env.ONBOARDING_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
}

export const clientServiceClient = {
    getStatistics: (ctx) =>
        client.get(`${process.env.CLIENT_SERVICE_URL}/internal/v1/clients/statistics`, {
            apiKey: process.env.CLIENT_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
}
