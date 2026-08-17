import client, { apiGet, apiGetList, apiPatch, apiPost } from "./client"

// The raw onboarding token is only ever held in memory by whichever
// component is driving the onboarding flow, then passed explicitly into
// every call here - it's never persisted to localStorage/sessionStorage.
const tokenHeaders = (token) => ({ headers: { "X-Onboarding-Token": token } })

export const getOnboarding = (type, token) => apiGet(`/api/v1/onboarding/${type}/${token}`)

export const autosaveOnboarding = (onboardingId, token, { type, data, currentStep }) =>
    apiPatch(`/api/v1/onboardings/${onboardingId}`, { type, data, currentStep }, tokenHeaders(token))

export const uploadOnboardingFile = async (onboardingId, token, { type, fieldKey, file }) => {
    const form = new FormData()
    form.append("type", type)
    form.append("fieldKey", fieldKey)
    form.append("file", file)
    const { data } = await client.post(`/api/v1/onboardings/${onboardingId}/files/upload`, form, {
        headers: { "X-Onboarding-Token": token, "Content-Type": "multipart/form-data" },
    })
    return data.data
}

export const submitOnboarding = (onboardingId, token, { type, consent }) =>
    apiPost(`/api/v1/onboardings/${onboardingId}/submit`, { type, consent }, tokenHeaders(token))

/* ---- Authenticated admin/review endpoints (JWT, via client.js interceptor) ---- */
export const listOnboardings = (params) => apiGetList("/api/v1/onboardings", params)
export const getOnboardingForReview = (id) => apiGet(`/api/v1/onboardings/${id}`)
export const approveOnboarding = (id) => apiPost(`/api/v1/onboardings/${id}/approve`)
export const rejectOnboarding = (id, reason) => apiPost(`/api/v1/onboardings/${id}/reject`, { reason })
export const requestOnboardingChanges = (id, items) => apiPost(`/api/v1/onboardings/${id}/request-changes`, { items })
