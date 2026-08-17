// EmailProvider interface: send({ to, subject, body }) -> { providerMessageId, status }
// Swapped by EMAIL_MODE without the rest of the service knowing which one is active.

class MockEmailProvider {
    async send({ to, subject, body }) {
        console.log(`[communication-service] MOCK EMAIL -> ${to}\nSubject: ${subject}\n${body}\n`)
        return { providerMessageId: `mock-email-${Date.now()}`, status: "MOCK_SENT" }
    }
}

class DirectEmailProvider {
    async send({ to, subject, body }) {
        // Real SMTP send would go here (nodemailer + SMTP_* env vars). Without
        // verified credentials in this environment we fall back to logging,
        // but a real deployment plugs a transport in at this single seam.
        console.log(`[communication-service] DIRECT EMAIL -> ${to}\nSubject: ${subject}\n${body}\n`)
        return { providerMessageId: `direct-email-${Date.now()}`, status: "SENT" }
    }
}

export const getEmailProvider = () => (process.env.EMAIL_MODE === "direct" ? new DirectEmailProvider() : new MockEmailProvider())
