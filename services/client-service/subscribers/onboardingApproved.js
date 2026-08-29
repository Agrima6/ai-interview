import { subscribe, publish } from "@workmateiq/common"
import * as clientService from "../services/client.service.js"

export const initSubscriptions = () => {
    subscribe("client_service_onboarding_approved", ["ONBOARDING_APPROVED"], async (payload, headers) => {
        console.log("[client-service] Received ONBOARDING_APPROVED event for onboarding:", payload.onboardingId)
        const client = await clientService.upsertFromOnboarding(payload)
        console.log("[client-service] Client created successfully with ID:", client.id)

        await publish("CLIENT_CREATED", {
            onboardingId: client.onboardingId,
            clientId: client.id,
            name: client.name,
            email: client.primaryContact?.email,
            contactName: client.primaryContact?.name,
        }, headers)
    })
}
