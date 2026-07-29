import openrouterComplete from "./ai/openrouter.provider.js"
import geminiComplete from "./ai/gemini.provider.js"
import groqComplete from "./ai/groq.provider.js"

// Tried in order; falls through to the next on any failure (rate limit,
// network error, empty response) so one exhausted/broken key doesn't take
// the whole app down.
const PROVIDERS = [
    { name: "OpenRouter", complete: openrouterComplete, enabled: () => !!process.env.OPENROUTER_API_KEY },
    { name: "Gemini", complete: geminiComplete, enabled: () => !!process.env.GEMINI_API_KEY },
    { name: "Groq", complete: groqComplete, enabled: () => !!process.env.GROQ_API_KEY },
]

export const askAi = async (messages) => {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error("Messages array is empty.")
    }

    const errors = []
    for (const provider of PROVIDERS) {
        if (!provider.enabled()) continue
        try {
            return await provider.complete(messages)
        } catch (error) {
            const detail = error.response?.data || error.message
            console.error(`${provider.name} failed, trying next provider:`, detail)
            errors.push(`${provider.name}: ${error.message}`)
        }
    }

    throw new Error(`All AI providers failed (${errors.join("; ") || "none configured"})`)
}

// Free/smaller models sometimes wrap JSON in markdown fences, or occasionally
// emit a malformed response outright. Strip fences and retry once before failing.
const stripJsonFences = (text) =>
    text.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim()

export const askAiJson = async (messages) => {
    for (let attempt = 0; attempt < 2; attempt++) {
        const raw = await askAi(messages)
        try {
            return JSON.parse(stripJsonFences(raw))
        } catch (error) {
            if (attempt === 1) {
                throw new Error("AI returned invalid JSON after retry.")
            }
        }
    }
}
