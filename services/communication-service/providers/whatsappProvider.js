import axios from "axios"

// WhatsAppProvider interface: send({ to, body, templateName, templateParams }) -> { providerMessageId, status }

const normalizePhone = (phone) => {
    if (!phone) throw new Error("Recipient phone number is required.")
    const digits = String(phone).replace(/\D/g, "")
    if (digits.length < 10) {
        throw new Error(`Invalid phone number: ${phone}. Expected valid international format.`)
    }
    if (digits.length === 10) {
        if (process.env.DEFAULT_COUNTRY_CODE) {
            return `${process.env.DEFAULT_COUNTRY_CODE.replace(/\D/g, "")}${digits}`
        }
        throw new Error(`Phone number ${phone} is missing country code. Expected E.164 format with country code.`)
    }
    return digits
}

class MockWhatsAppProvider {
    async send({ to, body }) {
        console.log(`[communication-service] MOCK WHATSAPP -> ${to}\n${body}\n`)
        return { providerMessageId: `mock-wa-${Date.now()}`, status: "MOCK_SENT" }
    }
}

class MetaWhatsAppProvider {
    async send({ to, body, templateName, templateParams }) {
        const token = process.env.WHATSAPP_TOKEN
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
        if (!token || !phoneNumberId) {
            throw new Error("[communication-service] WHATSAPP_MODE=direct requires WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment.")
        }

        const formattedRecipient = normalizePhone(to)
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

        let payload
        if (templateName) {
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedRecipient,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: process.env.WHATSAPP_LANGUAGE_CODE || "en_US" },
                    ...(templateParams?.length ? {
                        components: [{
                            type: "body",
                            parameters: templateParams.map((p) => ({ type: "text", text: String(p) })),
                        }],
                    } : {}),
                },
            }
        } else {
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedRecipient,
                type: "text",
                text: { preview_url: false, body },
            }
        }

        const { data } = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            timeout: 10000,
        })

        const messageId = data?.messages?.[0]?.id || `meta-wa-${Date.now()}`
        return { providerMessageId: messageId, status: "SENT" }
    }
}

export const getWhatsAppProvider = () => {
    if (process.env.WHATSAPP_MODE === "direct") return new MetaWhatsAppProvider()
    if (process.env.NODE_ENV === "production") {
        throw new Error("[communication-service] FATAL: WHATSAPP_MODE must be configured ('direct') in production. Mock WhatsApp provider is prohibited in production.")
    }
    return new MockWhatsAppProvider()
}
