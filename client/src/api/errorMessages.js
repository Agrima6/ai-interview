// Maps backend error codes to user-facing copy. Backend ApiError messages
// for 4xx responses are already hand-authored, safe strings (validation
// errors, "already registered", etc.) and pass through unchanged - this
// only overrides the handful of codes that are technical/internal in
// nature, plus anything that reaches the user as a raw 5xx/network failure.
const FRIENDLY_MESSAGES = {
    TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
    UNAUTHORIZED: "Your session has expired. Please sign in again.",
    NO_REFRESH_TOKEN: "Your session has expired. Please sign in again.",
    INVALID_REFRESH_TOKEN: "Your session has expired. Please sign in again.",
    REFRESH_TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
    REFRESH_TOKEN_REVOKED: "Your session has expired. Please sign in again.",
    FORBIDDEN: "You don't have permission to perform this action.",
    SERVICE_FORBIDDEN: "You don't have permission to perform this action.",
    NOT_FOUND: "The requested resource was not found.",
    INTERNAL_ERROR: "Something went wrong. Please try again.",
    NETWORK_ERROR: "Unable to connect. Check your internet connection and try again.",
    TOO_MANY_REQUESTS: "Too many attempts. Please try again later.",
}

// `status` lets a 5xx with an unrecognized/absent code still fall back to a
// safe generic message instead of surfacing whatever the server happened to
// send (a raw exception message, stack fragment, driver error, etc.) -
// backend 4xx ApiError messages are trusted as-is since they're always
// deliberately written for display.
export const getFriendlyMessage = (code, fallbackMessage, status) => {
    if (code && FRIENDLY_MESSAGES[code]) return FRIENDLY_MESSAGES[code]
    if (!status || status >= 500) return "Something went wrong. Please try again."
    return fallbackMessage
}
