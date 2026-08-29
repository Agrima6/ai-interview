import { subscribe, publish } from "@workmateiq/common"
import * as onboardingService from "../services/onboarding.service.js"

const clientNameFor = (type, data) => {
    if (type === "ORGANIZATION") return data.company_name
    if (type === "COLLEGE") return data.college_name
    return data.full_name
}

export const initSubscriptions = () => {
    subscribe("onboarding_service_registration_submitted", ["REGISTRATION_SUBMITTED"], async (payload, headers) => {
        console.log("[onboarding-service] Received REGISTRATION_SUBMITTED event for:", payload.registrationId)
        const { registrationId, type, contact, data } = payload
        
        const invitation = await onboardingService.createInvitation({
            registrationId,
            type,
            contact,
            data
        })

        console.log("[onboarding-service] Created invitation successfully for:", registrationId)

        const clientName = clientNameFor(type, data)
        await publish("INVITATION_CREATED", {
            registrationId,
            onboardingId: invitation.onboardingId,
            invitationId: invitation.invitationId,
            rawToken: invitation.rawToken,
            type,
            contact,
            clientName
        }, headers)
    })
}
