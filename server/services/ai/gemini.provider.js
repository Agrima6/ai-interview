import axios from "axios"

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash"

// Gemini's REST shape differs from the OpenAI-style {role, content} messages
// used everywhere else in this app: "system" messages become a separate
// systemInstruction field, and the remaining turns become contents with
// role "user"/"model" instead of "user"/"assistant".
const toGeminiPayload = (messages) => {
    const systemParts = messages
        .filter((m) => m.role === "system")
        .map((m) => ({ text: m.content }))

    const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))

    const payload = { contents }
    if (systemParts.length) payload.systemInstruction = { parts: systemParts }
    return payload
}

const complete = async (messages) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`
    const response = await axios.post(url, toGeminiPayload(messages), {
        headers: { "Content-Type": "application/json" },
    })

    const content = response?.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("")
    if (!content || !content.trim()) throw new Error("Gemini returned an empty response")
    return content
}

export default complete
