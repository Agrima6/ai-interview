import { subscribe } from "@workmateiq/common"
import * as communicationService from "../services/communication.service.js"
import mongoose from "mongoose"

export const initSubscriptions = () => {
    subscribe("communication_service_welcome_notification", ["WELCOME_NOTIFICATION_REQUESTED"], async (payload, headers) => {
        console.log("[communication-service] Received WELCOME_NOTIFICATION_REQUESTED event for:", payload.recipientEmail)
        
        await communicationService.sendAndRecord({
            entityType: "CLIENT",
            entityId: new mongoose.Types.ObjectId(),
            channel: "EMAIL",
            eventType: "CLIENT_APPROVED",
            recipient: payload.recipientEmail,
            variables: {
                recipientName: payload.recipientName,
                recipientEmail: payload.recipientEmail,
                clientName: payload.clientName,
                loginUrl: payload.loginUrl,
                tempPassword: payload.tempPassword,
            }
        })
    })

    subscribe("communication_service_general_send", ["COMMUNICATION_SEND"], async (payload, headers) => {
        console.log("[communication-service] Received COMMUNICATION_SEND event for eventType:", payload.eventType)
        await communicationService.sendAndRecord({
            entityType: payload.entityType,
            entityId: payload.entityId,
            channel: payload.channel,
            eventType: payload.eventType,
            recipient: payload.recipient,
            variables: payload.variables
        })
    })

    subscribe("communication_service_invitation_created", ["INVITATION_CREATED"], async (payload, headers) => {
        console.log("[communication-service] Received INVITATION_CREATED event for registration:", payload.registrationId)
        
        const onboardingUrl = `${process.env.ONBOARDING_BASE_URL || "http://localhost:4004"}/${payload.type.toLowerCase()}/${payload.rawToken}`
        const variables = { recipientName: payload.contact.name, clientName: payload.clientName, onboardingUrl }

        await communicationService.sendAndRecord({
            entityType: "REGISTRATION",
            entityId: payload.registrationId,
            channel: "EMAIL",
            eventType: "ONBOARDING_LINK",
            recipient: payload.contact.email,
            variables
        }).catch((err) => console.error("[communication-service] Email dispatch failed:", err.message))

        await communicationService.sendAndRecord({
            entityType: "REGISTRATION",
            entityId: payload.registrationId,
            channel: "WHATSAPP",
            eventType: "ONBOARDING_LINK",
            recipient: payload.contact.phone,
            variables
        }).catch((err) => console.error("[communication-service] WhatsApp dispatch failed:", err.message))
    })
}
