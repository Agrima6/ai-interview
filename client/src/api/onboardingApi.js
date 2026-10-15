import client, { apiGet, apiGetList, apiPatch, apiPost, GatewayUrl } from "./client"

// The raw onboarding token is only ever held in memory by whichever
// component is driving the onboarding flow, then passed explicitly into
// every call here - it's never persisted to localStorage/sessionStorage.
const tokenHeaders = (token) => ({ headers: { "X-Onboarding-Token": token } })

export const getOnboarding = (type, token) => apiGet(`/api/v1/onboarding/${type}/${token}`)

export const autosaveOnboarding = (onboardingId, token, { type, data, currentStep }) =>
    apiPatch(`/api/v1/onboardings/${onboardingId}`, { type, data, currentStep }, tokenHeaders(token))

export const uploadOnboardingFile = async (onboardingId, token, { type, fieldKey, file }, onProgress) => {
    const form = new FormData()
    form.append("type", type)
    form.append("fieldKey", fieldKey)
    form.append("file", file)
    try {
        const { data } = await client.post(`/api/v1/onboardings/${onboardingId}/files/upload`, form, {
            headers: { "X-Onboarding-Token": token, "Content-Type": "multipart/form-data" },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    onProgress(percentCompleted)
                }
            }
        })
        return data.data
    } catch (err) {
        // No HTTP response at all (connection dropped, request too large for a proxy, CORS-stripped error):
        // say what the person can do instead of the browser's bare "Network Error".
        if (!err.response) {
            throw new Error("The upload could not reach the server. Check your connection and try again, or choose a smaller file.")
        }
        const apiMessage = err.response.data?.error?.message
        throw new Error(err.response.status >= 500 && !apiMessage ? "The upload failed on our side. Please try again in a moment." : (apiMessage || "The upload failed. Please try again."))
    }
}

export const submitOnboarding = (onboardingId, token, { type, consent, captchaToken, captchaAnswer }) =>
    apiPost(`/api/v1/onboardings/${onboardingId}/submit`, { type, consent, captchaToken, captchaAnswer }, tokenHeaders(token))

// Private files open only through a short-lived signed link issued by the API (never a bare file URL).
export const getOnboardingFileLink = async (onboardingId, fileId, token, type) => {
    const { url } = await apiPost(`/api/v1/onboardings/${onboardingId}/files/${fileId}/link`, { type }, tokenHeaders(token))
    return `${GatewayUrl}${url}`
}
export const getReviewFileLink = async (onboardingId, fileId) => {
    const { url } = await apiPost(`/api/v1/onboardings/${onboardingId}/files/${fileId}/review-link`)
    return `${GatewayUrl}${url}`
}

/* ---- Authenticated admin/review endpoints (JWT, via client.js interceptor) ---- */
export const listOnboardings = (params) => apiGetList("/api/v1/onboardings", params)
export const getOnboardingForReview = (id) => apiGet(`/api/v1/onboardings/${id}`)
export const approveOnboarding = (id) => apiPost(`/api/v1/onboardings/${id}/approve`)
export const rejectOnboarding = (id, reason) => apiPost(`/api/v1/onboardings/${id}/reject`, { reason })
export const requestOnboardingChanges = (id, items) => apiPost(`/api/v1/onboardings/${id}/request-changes`, { items })
