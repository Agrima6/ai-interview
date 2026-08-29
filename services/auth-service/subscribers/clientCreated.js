import { subscribe, publish } from "@workmateiq/common"
import * as authService from "../services/auth.service.js"

export const initSubscriptions = () => {
    subscribe("auth_service_client_created", ["CLIENT_CREATED"], async (payload, headers) => {
        console.log("[auth-service] Received CLIENT_CREATED event for client:", payload.clientId)
        if (!payload.email) {
            console.warn("[auth-service] Client has no email address, skipping user creation")
            return
        }

        const credentials = await authService.createClientUser({
            email: payload.email,
            name: payload.contactName || payload.name,
            clientId: payload.clientId,
        })

        console.log("[auth-service] Client user created successfully for:", credentials.email)

        await publish("WELCOME_NOTIFICATION_REQUESTED", {
            recipientEmail: credentials.email,
            recipientName: payload.contactName || payload.name,
            clientName: payload.name,
            tempPassword: credentials.password,
            loginUrl: process.env.CLIENT_LOGIN_URL || "http://localhost:3000/login",
        }, headers)
    })
}
