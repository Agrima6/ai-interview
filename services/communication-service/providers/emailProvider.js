import axios from "axios"

// EmailProvider interface: send({ to, subject, body }) -> { providerMessageId, status }
// Swapped by EMAIL_MODE without the rest of the service knowing which one is active.

class MockEmailProvider {
    async send({ to, subject, body }) {
        console.log(`[communication-service] MOCK EMAIL -> ${to}\nSubject: ${subject}\n${body}\n`)
        return { providerMessageId: `mock-email-${Date.now()}`, status: "MOCK_SENT" }
    }
}

// Resend's API is plain HTTPS, so it isn't affected by hosts (like Render's
// free tier) that block outbound SMTP ports - that's what was silently
// hanging the old nodemailer/Gmail transport.
class DirectEmailProvider {
    async send({ to, subject, body }) {
        if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
            throw new Error("EMAIL_MODE=direct requires RESEND_API_KEY and EMAIL_FROM in .env")
        }
        const { data } = await axios.post(
            "https://api.resend.com/emails",
            { from: process.env.EMAIL_FROM, to, subject, text: body },
            { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
        )
        return { providerMessageId: data.id, status: "SENT" }
    }
}

export const getEmailProvider = () => (process.env.EMAIL_MODE === "direct" ? new DirectEmailProvider() : new MockEmailProvider())
