import axios from "axios"
import FormData from "form-data"

// Client for the standalone Python/LiveKit AI-interview agent
// (workmate-iq-agent - a separate FastAPI service, not one of this repo's
// Node microservices). It speaks its own form-encoded contract, not the
// {success,data,error} JSON envelope the rest of this codebase uses, so
// this wrapper normalizes just enough to be usable from here: unwrap the
// raw response body, and translate a failure into a plain Error the
// caller can catch the same way as any other outbound call.
const baseURL = () => process.env.AGENT_SERVICE_URL || "http://localhost:8000"
const client = () => {
    if (process.env.NODE_ENV === "production" && !process.env.AGENT_SERVICE_KEY) {
        throw new Error("[client-service] FATAL: AGENT_SERVICE_KEY is required in production.")
    }
    return axios.create({
        baseURL: baseURL(),
        timeout: 15000,
        headers: process.env.AGENT_SERVICE_KEY ? { "X-Agent-Key": process.env.AGENT_SERVICE_KEY } : {},
    })
}

// The agent's dev server (uvicorn, single-threaded) blocks its event loop
// during synchronous OpenAI calls (role/interview creation) - long enough
// that the underlying TCP connection occasionally gets dropped mid-request
// ("socket hang up") even though the same call succeeds a moment later.
// One retry absorbs that without surfacing a transient error to the
// candidate for what is, functionally, a slow-but-working call.
const demoFallbackEnabled = () => String(process.env.AGENT_DEMO_FALLBACK || "").toLowerCase() === "true"

const call = async (fn, fallbackFn, { retried = false } = {}) => {
    try {
        const res = await fn()
        return res.data
    } catch (error) {
        const isSocketHangUp = error.code === "ECONNRESET" || /socket hang up/i.test(error.message || "")
        if (isSocketHangUp && !retried) return call(fn, fallbackFn, { retried: true })
        // Offline DEMO mode only (AGENT_DEMO_FALLBACK=true) and only when the agent could not be reached at
        // all. It must never replace a real answer: a 404 from the agent means "that role/candidate/interview
        // does not exist here", which the caller relies on to recreate it (a freshly deployed agent has an empty
        // database). Substituting fake data for it produced fake interviews - a scripted demo greeting and
        // invented questions instead of the real interviewer - with no error anywhere.
        if (fallbackFn && !error.response && demoFallbackEnabled()) {
            console.warn(`[agentServiceClient] agent unreachable (${error.message}) - DEMO fallback in use`)
            return fallbackFn()
        }
        const message = error.response?.data?.detail || error.message
        const wrapped = new Error(message)
        wrapped.status = error.response?.status || 502
        throw wrapped
    }
}

const form = (fields) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(fields)) params.append(key, value)
    return params
}

export const agentServiceClient = {
    createRole: (name) =>
        call(
            () => client().post("/v1/roles", form({ name })),
            () => ({ id: "role_demo_" + Date.now(), name })
        ),

    createCandidate: (name, email) =>
        call(
            () => client().post("/v1/candidates", form({ name, email })),
            () => ({ id: "cand_demo_" + Date.now(), name, email })
        ),

    uploadResume: (candidateId, buffer, originalName) => {
        const data = new FormData()
        data.append("file", buffer, originalName || "resume.pdf")
        return call(
            () => client().post(`/v1/candidates/${candidateId}/resume`, data, { headers: data.getHeaders() }),
            () => ({ status: "ok" })
        )
    },

    createInterview: (candidateId, roleId, durationMinutes = 30, questions = [], focusAreas = []) => {
        const fields = { candidate_id: candidateId, role_id: roleId, duration_minutes: durationMinutes }
        // HR's weighted skills: the agent turns weights into HIGH/MEDIUM/LOW priorities and plans around them.
        if (Array.isArray(focusAreas) && focusAreas.length > 0) fields.focus_areas = JSON.stringify(focusAreas)
        if (Array.isArray(questions) && questions.length > 0) {
            fields.questions_json = JSON.stringify(questions)
        }
        const defaultQuestions = [
            { id: "q1", question_text: "Tell me about yourself, your technical background, and your key projects." },
            { id: "q2", question_text: "How do you design scalable applications and manage complex state?" },
            { id: "q3", question_text: "Explain how you handle asynchronous operations, error handling, and performance optimization." },
            { id: "q4", question_text: "Describe a challenging bug or architectural obstacle you faced and how you solved it." },
            { id: "q5", question_text: "What are your primary goals for personal and technical growth over the next 2-3 years?" }
        ]
        const resolvedQuestions = Array.isArray(questions) && questions.length > 0
            ? questions.map((q, idx) => ({ id: `q${idx + 1}`, question_text: q.text || q.question_text || (typeof q === "string" ? q : "Interview Question") }))
            : defaultQuestions

        return call(
            () => client().post("/v1/interviews", form(fields)),
            () => ({ id: "interview_demo_" + Date.now(), plan: { questions: resolvedQuestions } })
        )
    },

    getInterview: (interviewId) =>
        call(
            () => client().get(`/v1/interviews/${interviewId}`),
            () => ({
                id: interviewId,
                plan: {
                    questions: [
                        { id: "q1", question_text: "Tell me about yourself, your technical background, and your key projects." },
                        { id: "q2", question_text: "How do you design scalable applications and manage complex state?" },
                        { id: "q3", question_text: "Explain how you handle asynchronous operations, error handling, and performance optimization." },
                        { id: "q4", question_text: "Describe a challenging bug or architectural obstacle you faced and how you solved it." },
                        { id: "q5", question_text: "What are your primary goals for personal and technical growth over the next 2-3 years?" }
                    ]
                }
            })
        ),

    setLanguage: (interviewId, language) =>
        call(
            () => client().post(`/v1/interviews/${interviewId}/language`, form({ language })),
            () => ({ status: "ok" })
        ),

    getCandidateToken: (interviewId) =>
        call(
            () => client().post(`/v1/interviews/${interviewId}/candidate-token`),
            () => ({ url: null, token: null, isMock: true, room_name: "local-demo-" + Date.now() })
        ),

    completeInterview: (interviewId) =>
        call(
            () => client().post(`/v1/interviews/${interviewId}/complete`),
            () => ({ status: "ok" })
        ),

    // The stored conversation, in order. No demo fallback: a transcript must be real or absent.
    getTranscript: (interviewId) =>
        call(() => client().get(`/v1/interviews/${interviewId}/transcript`)),

    getReport: (interviewId) =>
        call(
            () => client().get(`/v1/interviews/${interviewId}/report`),
            () => ({
                final_score: 88,
                confidence: 90,
                communication: 86,
                technical: 88,
                summary: "Strong candidate with solid foundations, structured communication, and clear technical problem-solving ability."
            })
        ),
}

