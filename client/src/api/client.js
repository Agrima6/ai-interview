import axios from "axios"

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
        if (response?.status === 401 && !config._retried && !config.url.includes("/auth/")) {
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
        const wrapped = new Error(envelope?.error?.message || error.message)
        wrapped.code = envelope?.error?.code || "NETWORK_ERROR"
        wrapped.status = error.response?.status || 0
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
        const wrapped = new Error(envelope?.error?.message || error.message)
        wrapped.code = envelope?.error?.code || "NETWORK_ERROR"
        wrapped.status = error.response?.status || 0
        throw wrapped
    }
}

export default client
