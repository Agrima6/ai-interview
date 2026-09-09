import client, { apiGet, apiGetList, apiPost, apiPatch, apiPut, apiDelete } from "../client"

export const getOrganizationProfile = () => apiGet("/api/v1/organizations/me")

// Branding updates
export const updateOrganizationBranding = (payload) => apiPatch("/api/v1/organizations/me/branding", payload)

// Interview Drives & Round Management APIs
export const listInterviewDrives = (params) => apiGetList("/api/v1/drives", params)
export const createInterviewDrive = (payload) => apiPost("/api/v1/drives", payload)
export const getInterviewDriveById = (id) => apiGet(`/api/v1/drives/${id}`)
// Public/unauthenticated - what a candidate sees when they open their invite link.
export const getPublicDrive = (link) => apiGet(`/api/v1/drives/public/${link}`)
export const addRoundToInterviewDrive = (driveId, payload) => apiPost(`/api/v1/drives/${driveId}/rounds`, payload)
export const updateDriveStatus = (driveId, status) => apiPatch(`/api/v1/drives/${driveId}/status`, { status })
export const updateCandidateStatus = (driveId, roundNumber, candidateId, status) =>
    apiPatch(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/${candidateId}/status`, { status })
export const communicateWithCandidates = (driveId, roundNumber, payload) =>
    apiPost(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/communicate`, payload)

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

// SMTP Settings APIs
export const getSmtpSettings = () => apiGet("/api/v1/organization/smtp")
export const updateSmtpSettings = (payload) => apiPut("/api/v1/organization/smtp", payload)
export const testSmtpConnection = (payload) => apiPost("/api/v1/organization/smtp/test", payload)
