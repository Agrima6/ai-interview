import Registration from "../models/registration.model.js"

export const create = (data) => Registration.create(data)
export const updateStatus = (id, status) => Registration.findByIdAndUpdate(id, { status }, { new: true })

// Case-insensitive match against any registration still in flight - EXPIRED
// and CANCELLED ones don't block a resubmission, they're dead ends.
export const findActiveByEmail = (email) =>
    Registration.findOne({
        "contact.email": new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        status: { $in: ["SUBMITTED", "PROCESSING", "LINK_SENT"] },
    })
