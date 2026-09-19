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
