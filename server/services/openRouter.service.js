import axios from "axios"

export const askAi = async (messages) => {
    try {
        if(!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error("Messages array is empty.");
        }
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions",
            {
                model: "nvidia/nemotron-3-ultra-550b-a55b",
                messages: messages

            },
            {
            headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },});

        const content = response?.data?.choices?.[0]?.message?.content;

        if (!content || !content.trim()) {
      throw new Error("AI returned empty response.");
    }

    return content
    } catch (error) {
            console.error("OpenRouter Error:", error.response?.data || error.message);
    throw new Error("OpenRouter API Error");

    }
}

// Free/smaller models sometimes wrap JSON in markdown fences, or occasionally
// emit a malformed response outright. Strip fences and retry once before failing.
const stripJsonFences = (text) =>
    text.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

export const askAiJson = async (messages) => {
    for (let attempt = 0; attempt < 2; attempt++) {
        const raw = await askAi(messages);
        try {
            return JSON.parse(stripJsonFences(raw));
        } catch (error) {
            if (attempt === 1) {
                throw new Error("AI returned invalid JSON after retry.");
            }
        }
    }
}