import Communication from "../models/communication.model.js"

export const create = (data) => Communication.create(data)
export const findById = (id) => Communication.findById(id)
export const updateStatus = (id, patch) => Communication.findByIdAndUpdate(id, patch, { new: true })
export const listByEntity = (entityType, entityId) =>
    Communication.find({ entityType, entityId }).sort({ createdAt: -1 })

// Latest communication per candidate for a given drive/eventType - used by
// the "invite sent / opened" status the org dashboard shows per candidate.
// Sorted so, if a candidate was invited more than once, the newest send is
// the one whose status/openedAt actually reflects.
export const listByDriveAndEvent = (driveId, eventType) =>
    Communication.find({ "metadata.driveId": driveId, eventType }).sort({ createdAt: -1 })

// Only advances status forward (SENT/DELIVERED -> OPENED) - never
// downgrades a FAILED record or overwrites a later READ, and openedAt is
// set on every hit (a pixel can legitimately reload) but only the first
// hit's timestamp is kept.
export const markOpened = async (id) => {
    const communication = await Communication.findById(id)
    if (!communication) return null
    const patch = {}
    if (!communication.openedAt) patch.openedAt = new Date()
    if (["QUEUED", "SENT", "DELIVERED"].includes(communication.status)) patch.status = "OPENED"
    if (Object.keys(patch).length === 0) return communication
    return Communication.findByIdAndUpdate(id, patch, { new: true })
}

// Every invitation email tagged with one of these drives (AI interviews) or assessments (online tests), newest first. Capped:
// a billing page asks about a few hundred people at a time, not the whole history.
export const listInvites = ({ driveIds = [], assessmentIds = [] }, limit = 20000) =>
    Communication.find({ $or: [
        ...(driveIds.length ? [{ "metadata.driveId": { $in: driveIds }, eventType: "CANDIDATE_INVITE" }] : []),
        ...(assessmentIds.length ? [{ "metadata.assessmentId": { $in: assessmentIds }, eventType: "OA_INVITE" }] : []),
    ] }).select("status sentAt openedAt createdAt metadata").sort({ createdAt: -1 }).limit(limit).lean()

// Failed emails worth sending again: a temporary reason, not too many tries, recent. Oldest first.
export const listRetryable = ({ codes, maxAttempts, since, limit }) =>
    Communication.find({
        channel: "EMAIL", status: "FAILED", attempts: { $lt: maxAttempts }, failedAt: { $gte: since },
        // a temporary reason, or an older failure recorded before reasons were kept (reason unknown: one more try is cheap, and a refusal is then recognised)
        $or: [{ lastErrorCode: { $in: codes } }, { lastErrorCode: "PROVIDER_ERROR", lastError: null }],
    }).sort({ failedAt: 1 }).limit(limit)

// Take a failed email for retrying, once: two sweeps (or two processes) never send the same one twice.
export const claimForRetry = (id) =>
    Communication.findOneAndUpdate({ _id: id, status: "FAILED" }, { $set: { status: "QUEUED", lastRetryAt: new Date() } }, { new: true })
