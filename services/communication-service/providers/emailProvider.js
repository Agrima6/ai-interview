import axios from "axios"
import nodemailer from "nodemailer"

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
// hanging the old nodemailer/Gmail transport. Only downside: the shared
// onboarding@resend.dev sender can only deliver to the Resend account's own
// email until a custom domain is verified.
class ResendEmailProvider {
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

// Fallback path for testing whether this host's outbound SMTP is actually
// blocked - short timeouts so a network-level block fails fast instead of
// hanging silently for minutes.
let transporter = null
const getTransporter = () => {
    if (transporter) return transporter
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error("EMAIL_MODE=gmail requires EMAIL_USER and EMAIL_APP_PASSWORD in .env")
    }
    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
    })
    return transporter
}

class GmailSmtpProvider {
    async send({ to, subject, body }) {
        const info = await getTransporter().sendMail({
            from: `"WorkmateIQ" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text: body,
        })
        return { providerMessageId: info.messageId, status: "SENT" }
    }
}

export const getEmailProvider = () => {
    if (process.env.EMAIL_MODE === "direct") return new ResendEmailProvider()
    if (process.env.EMAIL_MODE === "gmail") return new GmailSmtpProvider()
    return new MockEmailProvider()
}
