import axios from "axios"

// Groq's chat-completions API is OpenAI-compatible, same request/response
// shape as OpenRouter - just a different base URL, key, and model.
const complete = async (messages) => {
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
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
        }
    )

    const content = response?.data?.choices?.[0]?.message?.content
    if (!content || !content.trim()) throw new Error("Groq returned an empty response")
    return content
}

export default complete
