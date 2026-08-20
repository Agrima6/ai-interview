import axios from "axios"

// Groq's chat-completions API is OpenAI-compatible, same request/response
// shape as OpenRouter - just a different base URL, key, and model.
//
// Multiple keys, tried in order: GROQ_API_KEY plus any comma-separated
// extras in GROQ_API_KEYS_FALLBACK. A key that's rate-limited or out of
// quota falls through to the next one automatically, same idea as the
// provider-level fallback in ai.service.js but one level down.
const _keys = [process.env.GROQ_API_KEY, ...(process.env.GROQ_API_KEYS_FALLBACK || "").split(",")]
    .map((k) => k.trim())
    .filter(Boolean)

const complete = async (messages) => {
    if (_keys.length === 0) throw new Error("Groq is not configured (missing GROQ_API_KEY)")

    let lastError = null
    for (const key of _keys) {
        try {
            const response = await axios.post("https://api.groq.com/openai/v1/chat/completions",
                {
                    // llama-3.3-70b-versatile was decommissioned by Groq; switched
                    // to a currently available model (confirmed against the live
                    // /openai/v1/models list on this account).
                    model: "openai/gpt-oss-120b",
                    messages,
                },
                {
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/json",
                    },
                }
            )
            const content = response?.data?.choices?.[0]?.message?.content
            if (!content || !content.trim()) throw new Error("Groq returned an empty response")
            return content
        } catch (error) {
            lastError = error
            const status = error.response?.status
            // Only rotate to the next key for quota/rate-limit/auth errors -
            // any other failure (bad request, model issue) would fail
            // identically on every key, so don't waste the retries.
            if (status !== 429 && status !== 401 && status !== 403) throw error
        }
    }
    throw lastError
}

export default complete
