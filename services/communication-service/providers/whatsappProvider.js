// WhatsAppProvider interface: send({ to, body }) -> { providerMessageId, status }

class MockWhatsAppProvider {
    async send({ to, body }) {
        console.log(`[communication-service] MOCK WHATSAPP -> ${to}\n${body}\n`)
        return { providerMessageId: `mock-wa-${Date.now()}`, status: "MOCK_SENT" }
    }
}

class MetaWhatsAppProvider {
    async send({ to, body }) {
        // Real Meta Cloud API call would go here (WHATSAPP_TOKEN / phone
        // number ID env vars). No verified credentials in this environment.
        console.log(`[communication-service] META WHATSAPP -> ${to}\n${body}\n`)
        return { providerMessageId: `meta-wa-${Date.now()}`, status: "SENT" }
    }
}

export const getWhatsAppProvider = () => (process.env.WHATSAPP_MODE === "direct" ? new MetaWhatsAppProvider() : new MockWhatsAppProvider())
