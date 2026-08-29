import { subscribe } from "@workmateiq/common"
import * as registrationRepo from "../repositories/registration.repository.js"

export const initSubscriptions = () => {
    subscribe("registration_service_invitation_created", ["INVITATION_CREATED"], async (payload, headers) => {
        console.log("[registration-service] Received INVITATION_CREATED event for registration:", payload.registrationId)
        
        await registrationRepo.updateStatus(payload.registrationId, "LINK_SENT")
        console.log("[registration-service] Registration status updated to LINK_SENT for:", payload.registrationId)
    })
}
