import { createInternalApiClient } from "../utils/internalApiClient.js"

const client = createInternalApiClient({ serviceName: process.env.SERVICE_NAME })
const ctxHeaders = (ctx) => ({ requestId: ctx?.requestId, correlationId: ctx?.correlationId })

export const onboardingServiceClient = {
    getStatistics: (ctx) =>
        client.get(`${process.env.ONBOARDING_SERVICE_URL}/internal/v1/statistics`, {
            apiKey: process.env.ONBOARDING_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
    getTrend: (days, ctx) =>
        client.get(`${process.env.ONBOARDING_SERVICE_URL}/internal/v1/statistics/trend`, {
            apiKey: process.env.ONBOARDING_SERVICE_API_KEY,
            params: { days },
            ...ctxHeaders(ctx),
        }),
    getActivity: ({ cursor, limit }, ctx) =>
        client.get(`${process.env.ONBOARDING_SERVICE_URL}/internal/v1/activity`, {
            apiKey: process.env.ONBOARDING_SERVICE_API_KEY,
            params: { cursor, limit },
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

export const enquiryServiceClient = {
    getStatistics: (ctx) =>
        client.get(`${process.env.ENQUIRY_SERVICE_URL}/internal/v1/enquiries/statistics`, {
            apiKey: process.env.ENQUIRY_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
    getTrend: (days, ctx) =>
        client.get(`${process.env.ENQUIRY_SERVICE_URL}/internal/v1/enquiries/statistics/trend`, {
            apiKey: process.env.ENQUIRY_SERVICE_API_KEY,
            params: { days },
            ...ctxHeaders(ctx),
        }),
}
