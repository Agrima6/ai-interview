import { apiGet, apiGetList, apiPost, apiPatch, apiPut, apiDelete } from "../client"

export const getOrganizationProfile = () => apiGet("/api/v1/organizations/me")

// Branding updates
export const updateOrganizationBranding = (payload) => apiPatch("/api/v1/organizations/me/branding", payload)

// Interview Drives & Round Management APIs
export const listInterviewDrives = (params) => apiGet("/api/v1/drives", params)
export const createInterviewDrive = (payload) => apiPost("/api/v1/drives", payload)
export const getInterviewDriveById = (id) => apiGet(`/api/v1/drives/${id}`)
// Public/unauthenticated - what a candidate sees when they open their invite link.
export const getPublicDrive = (link) => apiGet(`/api/v1/drives/public/${link}`)
export const addRoundToInterviewDrive = (driveId, payload) => apiPost(`/api/v1/drives/${driveId}/rounds`, payload)
export const updateDriveStatus = (driveId, status) => apiPatch(`/api/v1/drives/${driveId}/status`, { status })
export const updateCandidateStatus = (driveId, roundNumber, candidateId, status) =>
    apiPatch(`/api/v1/drives/${driveId}/rounds/${roundNumber}/candidates/${candidateId}/status`, { status })

// Candidates (aggregated across every drive/round for the organization)
export const listAllCandidates = (params) => apiGetList("/api/v1/candidates", params)

// Team & Access Control APIs
export const getTeamMembers = () => apiGet("/api/v1/organization/team")
export const inviteTeamMember = (payload) => apiPost("/api/v1/organization/team/invite", payload)
export const removeTeamMember = (id) => apiDelete(`/api/v1/organization/team/${id}`)

// Question Banks APIs
export const getQuestionBanks = () => apiGet("/api/v1/question-banks")
export const createQuestionBank = (payload) => apiPost("/api/v1/question-banks", payload)

// Notification Templates APIs
export const getNotificationTemplates = () => apiGet("/api/v1/organization/templates")
export const updateNotificationTemplate = (id, payload) => apiPut(`/api/v1/organization/templates/${id}`, payload)
