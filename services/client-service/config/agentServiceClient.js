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
const call = async (fn, { retried = false } = {}) => {
    try {
        const res = await fn()
        return res.data
    } catch (error) {
        const isSocketHangUp = error.code === "ECONNRESET" || /socket hang up/i.test(error.message || "")
        if (isSocketHangUp && !retried) return call(fn, { retried: true })
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
        call(() => client().post("/v1/roles", form({ name }))),

    createCandidate: (name, email) =>
        call(() => client().post("/v1/candidates", form({ name, email }))),

    // Resumes now live in S3/MinIO, not the local filesystem (plan.md #11),
    // so the caller fetches the object into a buffer and hands it here
    // directly rather than pointing us at a local file path.
    uploadResume: (candidateId, buffer, originalName) => {
        const data = new FormData()
        data.append("file", buffer, originalName || "resume.pdf")
        return call(() => client().post(`/v1/candidates/${candidateId}/resume`, data, { headers: data.getHeaders() }))
    },

    createInterview: (candidateId, roleId, durationMinutes = 30, questions = []) => {
        const fields = { candidate_id: candidateId, role_id: roleId, duration_minutes: durationMinutes }
        if (Array.isArray(questions) && questions.length > 0) {
            fields.questions_json = JSON.stringify(questions)
        }
        return call(() => client().post("/v1/interviews", form(fields)))
    },

    getInterview: (interviewId) =>
        call(() => client().get(`/v1/interviews/${interviewId}`)),

    setLanguage: (interviewId, language) =>
        call(() => client().post(`/v1/interviews/${interviewId}/language`, form({ language }))),

    getCandidateToken: (interviewId) =>
        call(() => client().post(`/v1/interviews/${interviewId}/candidate-token`)),

    completeInterview: (interviewId) =>
        call(() => client().post(`/v1/interviews/${interviewId}/complete`)),

    getReport: (interviewId) =>
        call(() => client().get(`/v1/interviews/${interviewId}/report`)),
}
