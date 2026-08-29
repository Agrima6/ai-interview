import * as enquiryRepo from "../repositories/enquiry.repository.js"
import { ApiError } from "@workmateiq/common"

const view = (e) => ({
    id: String(e._id),
    name: e.name,
    type: e.type,
    email: e.email,
    phone: e.phone,
    message: e.message,
    status: e.status,
    assignedTo: e.assignedTo,
    createdAt: e.createdAt,
    contactedAt: e.contactedAt,
    completedAt: e.completedAt,
    callNotes: e.callNotes,
    callDurationSec: e.callDurationSec,
    nextFollowUpAt: e.nextFollowUpAt,
})

export const submit = async ({ name, type, email, phone, message }) => {
    if (!name || !email || !message) throw new ApiError(400, "VALIDATION_FAILED", "Name, email and message are required.")
    const enquiry = await enquiryRepo.create({ name, type: type || "OTHER", email, phone, message })
    return view(enquiry)
}

export const list = async (query) => {
    const { items, hasNext, nextCursor } = await enquiryRepo.list(query)
    return { items: items.map(view), hasNext, nextCursor }
}

export const getById = async (id) => {
    const enquiry = await enquiryRepo.findById(id)
    if (!enquiry) throw new ApiError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.")
    return view(enquiry)
}

const VALID_STATUSES = ["NEW", "CONTACTED", "IN_PROGRESS", "PENDING", "COMPLETED"]

export const updateStatus = async (id, status, assignedTo) => {
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
        throw new ApiError(400, "INVALID_STATUS", `status must be one of ${VALID_STATUSES.join(", ")}.`)
    }
    const patch = { status }
    if (status === "CONTACTED" && !patch.contactedAt) patch.contactedAt = new Date()
    if (status === "COMPLETED") patch.completedAt = new Date()
    if (assignedTo !== undefined) patch.assignedTo = assignedTo
    const enquiry = await enquiryRepo.update(id, patch)
    if (!enquiry) throw new ApiError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.")
    return view(enquiry)
}

// A real integration would ring through a CallProvider adapter (Twilio/etc)
// and log a call record. No voice provider credentials exist in this
// environment, so this just records what the admin reports about the call -
// the seam is exactly where a real provider call would slot in.
export const logCall = async (id, { status, notes, durationSec, nextFollowUpAt } = {}) => {
    const resolvedStatus = status && VALID_STATUSES.includes(status) ? status : "CONTACTED"
    const patch = { status: resolvedStatus, contactedAt: new Date() }
    if (resolvedStatus === "COMPLETED") patch.completedAt = new Date()
    if (notes !== undefined) patch.callNotes = String(notes).slice(0, 2000) || null
    if (durationSec !== undefined) {
        const n = Number(durationSec)
        patch.callDurationSec = Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null
    }
    if (nextFollowUpAt !== undefined) {
        const d = nextFollowUpAt ? new Date(nextFollowUpAt) : null
        patch.nextFollowUpAt = d && !Number.isNaN(d.getTime()) ? d : null
    }
    const enquiry = await enquiryRepo.update(id, patch)
    if (!enquiry) throw new ApiError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.")
    return view(enquiry)
}

export const statistics = () => enquiryRepo.countByStatus()

export const trend = (since) => enquiryRepo.dailyCountsSince(since)
