import nodemailer from "nodemailer"

// EmailProvider interface: send({ to, subject, body }) -> { providerMessageId, status }
// Swapped by EMAIL_MODE without the rest of the service knowing which one is active.

class MockEmailProvider {
    async send({ to, subject, body }) {
        console.log(`[communication-service] MOCK EMAIL -> ${to}\nSubject: ${subject}\n${body}\n`)
        return { providerMessageId: `mock-email-${Date.now()}`, status: "MOCK_SENT" }
    }
}

let transporter = null
const getTransporter = () => {
    if (transporter) return transporter
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error("EMAIL_MODE=direct requires EMAIL_USER and EMAIL_APP_PASSWORD in .env")
    }
    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    })
    return transporter
}

class DirectEmailProvider {
    async send({ to, subject, body }) {
        const info = await getTransporter().sendMail({
            from: `"Workmate.IQ" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text: body,
        })
        return { providerMessageId: info.messageId, status: "SENT" }
    }
}

export const getEmailProvider = () => (process.env.EMAIL_MODE === "direct" ? new DirectEmailProvider() : new MockEmailProvider())
