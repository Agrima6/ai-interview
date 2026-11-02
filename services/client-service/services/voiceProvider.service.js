import { agentServiceClient } from "../config/agentServiceClient.js"
import { ApiError } from "../utils/response.js"
import { INTERVIEW_LANGUAGE_CODES } from "../utils/interviewLanguages.js"

// The two providers an administrator can choose between. The agent validates again; this is the first line.
export const VOICE_PROVIDERS = ["sarvam", "elevenlabs"]

// Translate the agent's HTTP status into an error the admin UI can show. Secrets never pass through here: the agent only
// reports which providers are configured (true/false), never a key.
const fromAgent = (err) => {
    const status = Number(err?.status) || 502
    const message = typeof err?.message === "string" && err.message !== "[object Object]" ? err.message : "The voice service rejected the request."
    if (status === 400) return new ApiError(400, "INVALID_PROVIDER", message)
    if (status === 409) return new ApiError(409, "SETTING_CONFLICT", message)
    if (status === 422) return new ApiError(422, "PROVIDER_NOT_CONFIGURED", message)
    return new ApiError(502, "VOICE_SERVICE_UNAVAILABLE", "The voice service is unavailable right now. Nothing was changed.")
}

export const getVoiceProviderSetting = async () => {
    try {
        return await agentServiceClient.getVoiceProvider()
    } catch (err) {
        throw fromAgent(err)
    }
}

export const updateVoiceProviderSetting = async ({ provider, expectedVersion }, actor) => {
    const normalized = String(provider || "").trim().toLowerCase()
    if (!VOICE_PROVIDERS.includes(normalized)) {
        throw new ApiError(400, "INVALID_PROVIDER", `Choose one of: ${VOICE_PROVIDERS.join(", ")}.`)
    }
    if (!actor) throw new ApiError(401, "UNAUTHENTICATED", "Sign in again to change this setting.")
    try {
        return await agentServiceClient.setVoiceProvider(normalized, actor, expectedVersion)
    } catch (err) {
        throw fromAgent(err)
    }
}

// The interview languages a candidate can be offered: the ones the ACTIVE voice can speak (the agent publishes them). If the
// agent cannot be reached the full list is returned - the agent itself still falls back safely if a language is unavailable.
export const getAvailableInterviewLanguages = async () => {
    try {
        const setting = await agentServiceClient.getVoiceProvider()
        const spoken = Array.isArray(setting?.supportedLanguages) ? setting.supportedLanguages : null
        if (spoken?.length) return INTERVIEW_LANGUAGE_CODES.filter((code) => spoken.includes(code))
    } catch { /* fall through */ }
    return [...INTERVIEW_LANGUAGE_CODES]
}
