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
