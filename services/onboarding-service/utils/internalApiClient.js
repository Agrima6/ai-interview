import axios from "axios"
import crypto from "crypto"

// Every outbound internal call carries this service's identity plus the
// current request's trace IDs, and normalizes the callee's envelope/errors
// so callers never touch the raw HTTP response.
export function createInternalApiClient({ serviceName }) {
    const client = axios.create({ timeout: 5000 })

    async function request(method, url, { apiKey, requestId, correlationId, data, params } = {}) {
        try {
            const res = await client.request({
                method,
                url,
                data,
                params,
                headers: {
                    "X-Service-Name": serviceName,
                    "X-Service-API-Key": apiKey,
                    "X-Request-ID": requestId || crypto.randomUUID(),
                    "X-Correlation-ID": correlationId || requestId,
                },
            })
            return res.data?.data
        } catch (error) {
            const status = error.response?.status || 502
            const message = error.response?.data?.error?.message || error.message
            const code = error.response?.data?.error?.code || "INTERNAL_CALL_FAILED"
            const wrapped = new Error(message)
            wrapped.status = status
            wrapped.code = code
            throw wrapped
        }
    }

    return {
        get: (url, opts) => request("get", url, opts),
        post: (url, data, opts) => request("post", url, { ...opts, data }),
        patch: (url, data, opts) => request("patch", url, { ...opts, data }),
    }
}
