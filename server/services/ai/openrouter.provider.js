import axios from "axios"

const complete = async (messages) => {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions",
        {
            model: "nvidia/nemotron-3-ultra-550b-a55b",
            messages,
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
        }
    )

    const content = response?.data?.choices?.[0]?.message?.content
    if (!content || !content.trim()) throw new Error("OpenRouter returned an empty response")
    return content
}

export default complete
