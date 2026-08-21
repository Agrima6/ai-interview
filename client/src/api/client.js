import axios from "axios"
import { getFriendlyMessage } from "./errorMessages"

export const GatewayUrl = import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000"

// The single API client every feature module goes through - components must
// never call axios/fetch directly. Owns the access token (in-memory only,
// never localStorage), 401 refresh-and-retry, and error normalization.
let accessToken = null
export const setAccessToken = (token) => { accessToken = token }
export const getAccessToken = () => accessToken

const client = axios.create({ baseURL: GatewayUrl, withCredentials: true })

client.interceptors.request.use((config) => {
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
    return config
})

let refreshPromise = null

client.interceptors.response.use(
    (res) => res,
    async (error) => {
        const { config, response } = error
        // Only attempt a refresh if we actually had a token that could have
        // expired - a bare 401 on a public, unauthenticated request (e.g.
        // registration/captcha) is a real error from that endpoint, not an
        // expired session, and retrying it just replaces the real error
        // with an unrelated "no refresh token" message.
        if (response?.status === 401 && accessToken && !config._retried && !config.url.includes("/auth/")) {
            config._retried = true
            try {
                refreshPromise = refreshPromise || client.post("/api/v1/auth/refresh")
                const { data } = await refreshPromise
                refreshPromise = null
                setAccessToken(data.data.accessToken)
                return client(config)
            } catch (refreshError) {
                refreshPromise = null
                setAccessToken(null)
                // Refresh token is expired/revoked/invalid - there's no path
                // back to a valid session short of signing in again. Redirect
                // rather than leaving the user stuck on a page whose data
                // will now 401 on every retry. A hard navigation (not
                // router-based) since this interceptor lives outside React
                // Router - simplest reliable way to guarantee it fires from
                // any page. Guarded against loops on the login/register
                // pages themselves, which fetch public data unauthenticated.
                if (typeof window !== "undefined" && !window.location.pathname.startsWith("/platform/login") && !window.location.pathname.startsWith("/platform/register")) {
                    window.location.assign("/platform/login?sessionExpired=1")
                }
                return Promise.reject(refreshError)
            }
        }
        return Promise.reject(error)
    }
)

// Unwraps the {success, data, error} envelope and throws a plain Error with
// .code/.status for callers that don't want to know the envelope shape.
const unwrap = async (promise) => {
    try {
        const { data } = await promise
        return data.data
    } catch (error) {
        const envelope = error.response?.data
        const status = error.response?.status || 0
        const code = envelope?.error?.code || "NETWORK_ERROR"
        const wrapped = new Error(getFriendlyMessage(code, envelope?.error?.message || error.message, status))
        wrapped.code = code
        wrapped.status = status
        throw wrapped
    }
}

export const apiGet = (url, params) => unwrap(client.get(url, { params }))
export const apiPost = (url, data, config) => unwrap(client.post(url, data, config))
export const apiPatch = (url, data, config) => unwrap(client.patch(url, data, config))

// For cursor-paginated list endpoints - keeps meta.cursor/hasNext alongside
// the items instead of discarding them like the plain unwrap() does.
export const apiGetList = async (url, params) => {
    try {
        const { data } = await client.get(url, { params })
        return { items: data.data, cursor: data.meta.cursor, hasNext: data.meta.hasNext }
    } catch (error) {
        const envelope = error.response?.data
        const status = error.response?.status || 0
        const code = envelope?.error?.code || "NETWORK_ERROR"
        const wrapped = new Error(getFriendlyMessage(code, envelope?.error?.message || error.message, status))
        wrapped.code = code
        wrapped.status = status
        throw wrapped
    }
}

export default client
