// Rules for round-outcome communications (selection / rejection). Pure functions, unit-tested.
//
// A communication's status is what actually happened, never what we hoped:
//   QUEUED     accepted by the communication service; not yet handed to the provider
//   SENT       the provider accepted it
//   DELIVERED  the recipient's server/device confirmed it (an open/read also implies delivery)
//   FAILED     no contact detail, or the provider/queue rejected it
// Asking the service to send is QUEUED, not SENT.

export const ACTIVE_STATUSES = ["QUEUED", "SENT", "DELIVERED"]     // these block a repeat of the same message
export const PURPOSES = ["CONGRATULATIONS", "REJECTION"]

/** Communication-service status -> ours. Anything unknown stays QUEUED (unconfirmed), never SENT. */
export function mapServiceStatus(status) {
    switch (String(status || "").toUpperCase()) {
        case "SENT": case "MOCK_SENT": return "SENT"
        case "DELIVERED": case "OPENED": case "READ": return "DELIVERED"
        case "FAILED": return "FAILED"
        default: return "QUEUED"
    }
}

/** Only ever move forward: QUEUED -> SENT -> DELIVERED. FAILED can be replaced by a retry, never regress a success. */
const RANK = { QUEUED: 0, SENT: 1, DELIVERED: 2 }
export const advanceStatus = (current, next) => {
    if (current === "FAILED" || current === undefined) return next
    if (next === "FAILED") return RANK[current] >= 1 ? current : "FAILED"
    return (RANK[next] ?? 0) > (RANK[current] ?? 0) ? next : current
}

/**
 * Decide, per candidate, whether to send. Returns { toSend, skipped: [{ candidate, reason }] }.
 * Reasons: ALREADY_SENT, DUPLICATE_REQUEST, ALREADY_SELECTED, ALREADY_REJECTED, NO_CONTACT.
 * A candidate is never both selected and rejected: the two purposes exclude each other.
 */
export function planDispatch(candidates, { purpose, channel, idempotencyKey }) {
    const toSend = []
    const skipped = []
    for (const candidate of candidates) {
        const history = candidate.communications || []
        const reason = (() => {
            if (idempotencyKey && history.some((c) => c.idempotencyKey === idempotencyKey)) return "DUPLICATE_REQUEST"
            if (history.some((c) => c.purpose === purpose && c.channel === channel && ACTIVE_STATUSES.includes(c.status))) return "ALREADY_SENT"
            if (purpose === "CONGRATULATIONS" && candidate.status === "REJECTED") return "ALREADY_REJECTED"
            if (purpose === "REJECTION" && candidate.status === "SHORTLISTED") return "ALREADY_SELECTED"
            return null
        })()
        if (reason) skipped.push({ candidate, reason })
        else toSend.push(candidate)
    }
    return { toSend, skipped }
}

export const SKIP_MESSAGES = {
    ALREADY_SENT: "This message was already sent to this candidate.",
    DUPLICATE_REQUEST: "This request was already processed.",
    ALREADY_SELECTED: "This candidate is already selected, so a rejection was not sent.",
    ALREADY_REJECTED: "This candidate is already rejected, so a selection message was not sent.",
}
