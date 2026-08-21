import { createInternalApiClient } from "../utils/internalApiClient.js"

const client = createInternalApiClient({ serviceName: process.env.SERVICE_NAME })
const ctxHeaders = (ctx) => ({ requestId: ctx?.requestId, correlationId: ctx?.correlationId })

export const communicationServiceClient = {
    send: (payload, ctx) =>
        client.post(`${process.env.COMMUNICATION_SERVICE_URL}/internal/v1/communications`, payload, {
            apiKey: process.env.COMMUNICATION_SERVICE_API_KEY,
            ...ctxHeaders(ctx),
        }),
}
