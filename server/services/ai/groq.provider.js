import axios from "axios"

// Groq's chat-completions API is OpenAI-compatible, same request/response
// shape as OpenRouter - just a different base URL, key, and model.
const complete = async (messages) => {
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions",
        {
            model: "llama-3.3-70b-versatile",
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
