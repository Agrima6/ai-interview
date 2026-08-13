import axios from "axios"
import { ServerUrl } from "../constants"

const withOrg = (organizationId) => (organizationId ? { params: { organizationId } } : {})

// ---- Question Banks ----

export const listQuestionBanks = async (organizationId) => {
    const response = await axios.get(ServerUrl + "/api/question-banks", { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const getQuestionBank = async (id, organizationId) => {
    const response = await axios.get(ServerUrl + `/api/question-banks/${id}`, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const createQuestionBank = async (payload, organizationId) => {
    const response = await axios.post(ServerUrl + "/api/question-banks", { ...payload, organizationId }, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const updateQuestionBank = async (id, payload, organizationId) => {
    const response = await axios.patch(ServerUrl + `/api/question-banks/${id}`, payload, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const deleteQuestionBank = async (id, organizationId) => {
    const response = await axios.delete(ServerUrl + `/api/question-banks/${id}`, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const uploadQuestionBank = async (file, title, defaultType, organizationId) => {
    const form = new FormData()
    form.append("file", file)
    form.append("title", title)
    if (defaultType) form.append("defaultType", defaultType)
    if (organizationId) form.append("organizationId", organizationId)
    const response = await axios.post(ServerUrl + "/api/question-banks/upload", form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        ...withOrg(organizationId),
    })
    return response.data
}

// ---- Interview Templates ----

export const listInterviewTemplates = async (organizationId) => {
    const response = await axios.get(ServerUrl + "/api/interview-templates", { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const getInterviewTemplate = async (id, organizationId) => {
    const response = await axios.get(ServerUrl + `/api/interview-templates/${id}`, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const createInterviewTemplate = async (payload, organizationId) => {
    const response = await axios.post(ServerUrl + "/api/interview-templates", { ...payload, organizationId }, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const updateInterviewTemplate = async (id, payload, organizationId) => {
    const response = await axios.patch(ServerUrl + `/api/interview-templates/${id}`, payload, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const deleteInterviewTemplate = async (id, organizationId) => {
    const response = await axios.delete(ServerUrl + `/api/interview-templates/${id}`, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

// ---- Invites ----

export const listInvites = async (organizationId) => {
    const response = await axios.get(ServerUrl + "/api/invites", { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const createInvite = async (payload, organizationId) => {
    const response = await axios.post(ServerUrl + "/api/invites", { ...payload, organizationId }, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}

export const resendInvite = async (id, organizationId) => {
    const response = await axios.post(ServerUrl + `/api/invites/${id}/resend`, {}, { withCredentials: true, ...withOrg(organizationId) })
    return response.data
}
