import "dotenv/config"
import connectDb from "../config/connectDb.js"
import * as templateRepo from "../repositories/template.repository.js"

const templates = [
    {
        channel: "EMAIL", eventType: "ONBOARDING_LINK", name: "Onboarding link (email)",
        subject: "Welcome to WorkmateIQ, {{recipientName}} - let's finish your onboarding",
        body: "Hi {{recipientName}},\n\nThanks for registering {{clientName}} with WorkmateIQ. Continue your onboarding here:\n{{onboardingUrl}}\n\nThis link is valid for 7 days.\n\n- The WorkmateIQ team",
        variables: ["recipientName", "clientName", "onboardingUrl"],
    },
    {
        channel: "WHATSAPP", eventType: "ONBOARDING_LINK", name: "Onboarding link (WhatsApp)",
        body: "Hi {{recipientName}}! Continue your WorkmateIQ onboarding for {{clientName}}: {{onboardingUrl}}",
        providerTemplateName: "onboarding_link_v1",
        variables: ["recipientName", "clientName", "onboardingUrl"],
    },
    {
        channel: "EMAIL", eventType: "PASSWORD_RESET", name: "Password reset (email)",
        subject: "Reset your WorkmateIQ password",
        body: "Hi {{recipientName}},\n\nWe received a request to reset your WorkmateIQ password. Reset it here:\n{{resetUrl}}\n\nThis link is valid for 1 hour. If you didn't request this, you can safely ignore this email - your password won't be changed.\n\n- The WorkmateIQ team",
        variables: ["recipientName", "resetUrl"],
    },
    {
        channel: "EMAIL", eventType: "CLIENT_APPROVED", name: "Client approved (email)",
        subject: "{{clientName}} is approved on WorkmateIQ - here's your login",
        body: "Hi {{recipientName}},\n\nGreat news - {{clientName}} has been approved on WorkmateIQ. You can now sign in to your dashboard:\n{{loginUrl}}\n\nEmail: {{recipientEmail}}\nTemporary password: {{tempPassword}}\n\nYou'll be asked to set a new password the first time you sign in.\n\n- The WorkmateIQ team",
        variables: ["recipientName", "recipientEmail", "clientName", "loginUrl", "tempPassword"],
    },
    {
        channel: "EMAIL", eventType: "ONBOARDING_SUBMITTED", name: "Onboarding submitted (email)",
        subject: "We've received {{clientName}}'s onboarding application",
        body: "Hi {{recipientName}},\n\nThanks - we've received your onboarding application for {{clientName}}. Our team will review it and get back to you with next steps.\n\n- The WorkmateIQ team",
        variables: ["recipientName", "clientName"],
    },
]

const run = async () => {
    await connectDb()
    for (const t of templates) {
        await templateRepo.upsertPublished(t.channel, t.eventType, t)
        console.log(`Published ${t.channel} template for ${t.eventType}`)
    }
    process.exit(0)
}

run().catch((err) => { console.error(err); process.exit(1) })
