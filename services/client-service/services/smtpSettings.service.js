import nodemailer from "nodemailer"
import Client from "../models/client.model.js"
import { ApiError } from "../utils/response.js"
import { encryptSecret, decryptSecret } from "../utils/crypto.js"

// Never returns encryptedPassword/plaintext password - the frontend only
// ever learns whether a password has been set, never its value.
const view = (client) => ({
    host: client.smtp?.host || null,
    port: client.smtp?.port || null,
    encryption: client.smtp?.encryption || "TLS",
    username: client.smtp?.username || null,
    hasPassword: Boolean(client.smtp?.encryptedPassword),
    // Falls back to the organization's contact email so the admin never has
    // to type a duplicate address by hand (integration.md section 7/27) -
    // access tokens don't carry the individual signed-in user's own email,
    // only tenantId/roles, so the org's contact email is the closest real
    // "account email" this service can derive without a cross-service call.
    fromEmail: client.smtp?.fromEmail || client.primaryContact?.email || null,
    fromName: client.smtp?.fromName || client.name || null,
    configured: Boolean(client.smtp?.configured),
    lastTestedAt: client.smtp?.lastTestedAt || null,
    lastTestStatus: client.smtp?.lastTestStatus || null,
})

export const getSmtpSettings = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "NOT_AN_ORGANIZATION_ACCOUNT", "This account is not linked to an organization.")
    const client = await Client.findById(tenantId)
    if (!client) throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "Organization not found.")
    return view(client)
}

const PORT_RANGE = { min: 1, max: 65535 }

const validate = ({ host, port, encryption, username, fromEmail }) => {
    if (host !== undefined && (typeof host !== "string" || !host.trim())) throw new ApiError(400, "INVALID_HOST", "SMTP host is required.")
    if (port !== undefined) {
        const n = Number(port)
        if (!Number.isInteger(n) || n < PORT_RANGE.min || n > PORT_RANGE.max) throw new ApiError(400, "INVALID_PORT", "SMTP port must be a valid port number.")
    }
    if (encryption !== undefined && !["NONE", "SSL", "TLS"].includes(encryption)) throw new ApiError(400, "INVALID_ENCRYPTION", "Encryption must be NONE, SSL, or TLS.")
    if (username !== undefined && (typeof username !== "string" || !username.trim())) throw new ApiError(400, "INVALID_USERNAME", "SMTP username is required.")
    if (fromEmail !== undefined && fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) throw new ApiError(400, "INVALID_FROM_EMAIL", "From email must be a valid email address.")
}

export const updateSmtpSettings = async (tenantId, body = {}) => {
    if (!tenantId) throw new ApiError(403, "NOT_AN_ORGANIZATION_ACCOUNT", "This account is not linked to an organization.")
    const { host, port, encryption, username, password, fromName, fromEmail } = body
    validate({ host, port, encryption, username, fromEmail })

    const patch = {}
    if (host !== undefined) patch["smtp.host"] = host.trim()
    if (port !== undefined) patch["smtp.port"] = Number(port)
    if (encryption !== undefined) patch["smtp.encryption"] = encryption
    if (username !== undefined) patch["smtp.username"] = username.trim()
    if (fromName !== undefined) patch["smtp.fromName"] = fromName?.trim() || null
    if (fromEmail !== undefined) patch["smtp.fromEmail"] = fromEmail?.trim() || null
    // Blank password field on an edit means "leave it as-is" - only a
    // non-empty value ever overwrites the stored secret.
    if (password) patch["smtp.encryptedPassword"] = encryptSecret(password)

    const existing = await Client.findById(tenantId).select("+smtp.encryptedPassword")
    if (!existing) throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "Organization not found.")

    const willHaveHost = patch["smtp.host"] !== undefined ? patch["smtp.host"] : existing.smtp?.host
    const willHaveUsername = patch["smtp.username"] !== undefined ? patch["smtp.username"] : existing.smtp?.username
    const willHavePassword = patch["smtp.encryptedPassword"] !== undefined ? patch["smtp.encryptedPassword"] : existing.smtp?.encryptedPassword
    patch["smtp.configured"] = Boolean(willHaveHost && willHaveUsername && willHavePassword)

    const updated = await Client.findByIdAndUpdate(tenantId, { $set: patch }, { new: true, runValidators: true })
    return view(updated)
}

const buildTransportOptions = (client, overridePassword) => {
    const port = Number(client.smtp?.port)
    const encryption = client.smtp?.encryption || "TLS"
    const password = overridePassword || (client.smtp?.encryptedPassword ? decryptSecret(client.smtp.encryptedPassword) : null)

    if (!client.smtp?.host || !client.smtp?.username || !password) {
        throw new ApiError(400, "SMTP_NOT_CONFIGURED", "Host, username, and password are all required to test the connection.")
    }

    return {
        host: client.smtp.host,
        port,
        secure: encryption === "SSL", // SSL = implicit TLS on connect; TLS/NONE negotiate via STARTTLS or plain
        requireTLS: encryption === "TLS",
        auth: { user: client.smtp.username, pass: password },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
    }
}

// Verifies the SMTP handshake/auth only - never sends a real email, so
// "Test Connection" is safe to click repeatedly without spamming anyone.
// Accepts an in-flight `password` so a user can test before saving (e.g.
// while first setting up), falling back to the already-saved credential.
export const testSmtpConnection = async (tenantId, { password } = {}) => {
    if (!tenantId) throw new ApiError(403, "NOT_AN_ORGANIZATION_ACCOUNT", "This account is not linked to an organization.")
    const client = await Client.findById(tenantId).select("+smtp.encryptedPassword")
    if (!client) throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "Organization not found.")

    let status = "FAILED"
    let message
    try {
        const transporter = nodemailer.createTransport(buildTransportOptions(client, password))
        await transporter.verify()
        status = "SUCCESS"
        message = "Connection successful. Your SMTP credentials are valid."
    } catch (error) {
        message = error instanceof ApiError ? error.message : "Could not connect with the provided SMTP credentials."
    }

    await Client.findByIdAndUpdate(tenantId, {
        $set: { "smtp.lastTestedAt": new Date(), "smtp.lastTestStatus": status },
    })

    if (status === "FAILED") throw new ApiError(400, "SMTP_TEST_FAILED", message)
    return { status, message }
}
