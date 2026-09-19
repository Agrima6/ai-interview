import client, { apiGet, apiGetList, apiPost, apiPatch, apiPut, apiDelete } from "../client"

export const getOrganizationProfile = () => apiGet("/api/v1/organizations/me")

// Branding updates
export const updateOrganizationBranding = (payload) => apiPatch("/api/v1/organizations/me/branding", payload)

// Interview Drives & Round Management APIs
export const listInterviewDrives = (params) => apiGetList("/api/v1/drives", params)
export const createInterviewDrive = (payload) => apiPost("/api/v1/drives", payload)
export const getInterviewDriveById = (id) => apiGet(`/api/v1/drives/${id}`)
export const addCandidatesToDrive = (driveId, candidates, roundNumber = 1) => apiPost(`/api/v1/drives/${driveId}/candidates`, { candidates, roundNumber })
// Public/unauthenticated - what a candidate sees when they open their invite link.
export const getPublicDrive = (link) => apiGet(`/api/v1/drives/public/${link}`)
// Public/unauthenticated self-service application - multipart because it carries the resume file.
export const applyToDrive = (link, formData) => apiPost(`/api/v1/drives/public/${link}/apply`, formData)
// Public/unauthenticated - whatever HR already filled in for this email (bulk import, etc), so the apply form can lock those fields instead of asking the candidate to retype them.
export const getApplicationPrefill = (link, email, token) => apiGet(`/api/v1/drives/public/${link}/prefill`, { email, token })
// Authenticated (CANDIDATE role) - the signed-in candidate's own scheduled interviews, across every drive/round they applied to.
export const getMyInterviews = () => apiGet("/api/v1/candidate/me/interviews")
// Authenticated (CANDIDATE role) - completes application (resume + slot) directly from the portal
export const submitCandidateApplication = (driveId, roundNumber, formData) =>
    apiPost(`/api/v1/candidate/me/interviews/${driveId}/rounds/${roundNumber}/apply`, formData)
// Authenticated (CANDIDATE role) - proctoring event reporting + end-of-attempt marker for the candidate's own interview room.
export const reportInterviewViolation = (driveId, roundNumber, reason, snapshot, screenSnapshot) =>
    apiPost(`/api/v1/candidate/me/interviews/${driveId}/rounds/${roundNumber}/violations`, { reason, snapshot, screenSnapshot })
export const completeInterview = (driveId, roundNumber) =>
    apiPost(`/api/v1/candidate/me/interviews/${driveId}/rounds/${roundNumber}/complete`)
// Authenticated (CANDIDATE role) - bridges into the AI-interview agent: starts/resumes the agent-side interview and returns a LiveKit room + token to join directly.
export const startAgentInterview = (driveId, roundNumber) =>
    apiPost(`/api/v1/candidate/me/interviews/${driveId}/rounds/${roundNumber}/agent-session`)
export const completeAgentInterview = (driveId, roundNumber) =>
    apiPost(`/api/v1/candidate/me/interviews/${driveId}/rounds/${roundNumber}/agent-complete`)
// Authenticated (CANDIDATE role) - uploads the candidate's own camera/mic recording of the session, captured client-side by MediaRecorder.
export const uploadInterviewRecording = (driveId, roundNumber, blob) => {
    const formData = new FormData()
    formData.append('recording', blob, 'interview.webm')
    return apiPost(`/api/v1/candidate/me/interviews/${driveId}/rounds/${roundNumber}/recording`, formData)
}
// Authenticated (HR) - the candidate's full interview recording, played inline (not downloaded) via a blob URL, same auth pattern as downloadCandidateResume.
export const getCandidateRecordingUrl = async (driveId, roundNumber, candidateId) => {
    const response = await client.get(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/${candidateId}/recording`, { responseType: 'blob' })
    return window.URL.createObjectURL(response.data)
}
// Authenticated (HR) - downloads the candidate's uploaded resume file. Uses
// the shared axios client (not a bare <a href>) because auth is a bearer
// token in memory, not a cookie a plain link request would carry.
export const downloadCandidateResume = async (driveId, roundNumber, candidateId, filename) => {
    const response = await client.get(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/${candidateId}/resume`, { responseType: "blob" })
    const url = window.URL.createObjectURL(response.data)
    const link = document.createElement("a")
    link.href = url
    link.download = filename || "resume"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
}
export const addRoundToInterviewDrive = (driveId, payload) => apiPost(`/api/v1/drives/${driveId}/rounds`, payload)
export const updateDriveStatus = (driveId, status) => apiPatch(`/api/v1/drives/${driveId}/status`, { status })
export const updateRoundStatus = (driveId, roundNumber, status) => apiPatch(`/api/v1/drives/${driveId}/rounds/${roundNumber}/status`, { status })
export const updateRound = (driveId, roundNumber, payload) => apiPatch(`/api/v1/drives/${driveId}/rounds/${roundNumber}`, payload)
export const updateCandidateStatus = (driveId, roundNumber, candidateId, status) =>
    apiPatch(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/${candidateId}/status`, { status })
export const updateCandidate = (driveId, roundNumber, candidateId, payload) =>
    apiPatch(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/${candidateId}`, payload)
export const removeCandidate = (driveId, roundNumber, candidateId) =>
    apiDelete(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/${candidateId}`)
export const communicateWithCandidates = (driveId, roundNumber, payload) =>
    apiPost(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/communicate`, payload)

// Downloads only the drives matching the caller's current filters - same
// filter set listInterviewDrives accepts, so the exported file always
// matches what's on screen (integration.md #16).
export const exportDrivesCsv = async (params) => {
    const res = await client.get("/api/v1/drives/export", { params, responseType: "blob" })
    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `drives-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

// Candidates (aggregated across every drive/round for the organization)
export const listAllCandidates = (params) => apiGetList("/api/v1/candidates", params)

// CSV export bypasses the {success,data} envelope (it's a raw file), so it
// goes through the axios client directly rather than apiGet/apiGetList.
// Downloads only the filtered dataset the caller asked for - never the
// full unfiltered table with client-side filtering (integration.md #16).
export const exportCandidatesCsv = async (params) => {
    const res = await client.get("/api/v1/candidates/export", { params, responseType: "blob" })
    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `candidates-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

// Reports page KPI/funnel/department-breakdown widgets - same aggregate the
// per-organization dashboard uses, just consumed directly here instead of
// through useOrganizationDashboard (Reports doesn't need attention/activity).
export const getOrganizationReport = (range) => apiGet("/api/v1/organizations/me/dashboard/trends", { range })
export const getOrganizationReportSummary = () => apiGet("/api/v1/organizations/me/dashboard/summary")

// Team & Access Control APIs
export const getTeamMembers = () => apiGet("/api/v1/organization/team")
export const inviteTeamMember = (payload) => apiPost("/api/v1/organization/team/invite", payload)
export const removeTeamMember = (id) => apiDelete(`/api/v1/organization/team/${id}`)

// Question Banks APIs
export const getQuestionBanks = () => apiGet("/api/v1/question-banks")
export const createQuestionBank = (payload) => apiPost("/api/v1/question-banks", payload)

// Notification Templates APIs
export const getNotificationTemplates = () => apiGet("/api/v1/organization/templates")
export const createNotificationTemplate = (payload) => apiPost("/api/v1/organization/templates", payload)
export const updateNotificationTemplate = (id, payload) => apiPut(`/api/v1/organization/templates/${id}`, payload)
export const deleteNotificationTemplate = (id) => apiDelete(`/api/v1/organization/templates/${id}`)
export const previewNotificationTemplate = (id, payload) => apiPost(`/api/v1/organization/templates/${id}/preview`, payload)

// SMTP Settings APIs
export const getSmtpSettings = () => apiGet("/api/v1/organization/smtp")
export const updateSmtpSettings = (payload) => apiPut("/api/v1/organization/smtp", payload)
export const testSmtpConnection = (payload) => apiPost("/api/v1/organization/smtp/test", payload)
